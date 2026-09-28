-- ゲーム要素 フェーズB(続き): ガチャの出現確率を管理者画面から変更できるようにする。
-- カード枚数はレアリティごとに今後増減するため、出現率は「1枚あたりの重み」ではなく
-- 「レアリティごとの重み」で持ち、抽選を2段階にする。
--   1. レアリティを重みで選ぶ(カードが1枚も無いレアリティは対象外にして残りで按分)
--   2. 選ばれたレアリティの中から、旬の食材を season_multiplier 倍の重みにして1枚選ぶ
-- 0022の draw_gacha()(1枚あたりの重み方式)を置き換える。

-- ============================================================
-- 1. 設定(アプリ全体で1行のみ。ai_model_settingsと同じシングルトン形式)
-- ============================================================
create table if not exists public.game_gacha_settings (
  id boolean primary key default true check (id),
  weight_normal numeric not null default 65 check (weight_normal >= 0),
  weight_rare numeric not null default 24 check (weight_rare >= 0),
  weight_super_rare numeric not null default 8 check (weight_super_rare >= 0),
  weight_legendary numeric not null default 3 check (weight_legendary >= 0),
  season_multiplier numeric not null default 3 check (season_multiplier >= 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  check (weight_normal + weight_rare + weight_super_rare + weight_legendary > 0)
);

insert into public.game_gacha_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.game_gacha_settings enable row level security;

create policy "authenticated can select game_gacha_settings"
  on public.game_gacha_settings for select
  to authenticated
  using (true);

create policy "admins can update game_gacha_settings"
  on public.game_gacha_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 2. ガチャを1回引く(2段階抽選版)
-- ============================================================
create or replace function public.draw_gacha(p_family_id uuid)
returns table (drawn_card_id uuid, is_new_card boolean, total_owned int, draws_remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_month int := extract(month from (now() at time zone 'Asia/Tokyo'))::int;
  v_base constant int := 3;
  v_profile public.family_game_profile%rowtype;
  v_settings public.game_gacha_settings%rowtype;
  v_rarity_roll numeric := random();
  v_card_roll numeric := random();
  v_rarity text;
  v_card_id uuid;
  v_prev_acquired_at timestamptz;
  v_owned int;
begin
  if v_user is null or not public.is_family_member(p_family_id) then
    raise exception 'forbidden';
  end if;

  -- 家族の行を作ってロック(同時に引いても回数を超えないようにする)
  insert into public.family_game_profile (family_id, gacha_date)
  values (p_family_id, v_today)
  on conflict (family_id) do nothing;

  select * into v_profile
  from public.family_game_profile
  where family_id = p_family_id
  for update;

  -- 日付が変わっていれば使用済み・ボーナスをリセット
  if v_profile.gacha_date <> v_today then
    v_profile.gacha_date := v_today;
    v_profile.draws_used_today := 0;
    v_profile.bonus_draws_today := 0;
  end if;

  if v_base + v_profile.bonus_draws_today - v_profile.draws_used_today <= 0 then
    raise exception 'gacha_no_draws_left';
  end if;

  select * into v_settings from public.game_gacha_settings where id = true;

  -- 1段階目: レアリティの抽選(カードが1枚も無い・重み0のレアリティは対象外)
  select cum.rarity into v_rarity
  from (
    select
      w.rarity,
      sum(w.weight) over (order by w.ord) as cum_weight,
      sum(w.weight) over () as total_weight
    from (
      values
        ('normal', 1, v_settings.weight_normal),
        ('rare', 2, v_settings.weight_rare),
        ('super_rare', 3, v_settings.weight_super_rare),
        ('legendary', 4, v_settings.weight_legendary)
    ) as w(rarity, ord, weight)
    where w.weight > 0
      and exists (select 1 from public.game_cards gc where gc.rarity = w.rarity)
  ) cum
  where cum.cum_weight > v_rarity_roll * cum.total_weight
  order by cum.cum_weight
  limit 1;

  if v_rarity is null then
    raise exception 'gacha_no_cards';
  end if;

  -- 2段階目: 選ばれたレアリティの中から1枚(旬の食材は重みを season_multiplier 倍にする)
  select cum.id into v_card_id
  from (
    select
      weighted.id,
      sum(weighted.w) over (order by weighted.id) as cum_weight,
      sum(weighted.w) over () as total_weight
    from (
      select
        gc.id,
        case when im.season_months is not null and v_month = any(im.season_months)
          then v_settings.season_multiplier else 1 end as w
      from public.game_cards gc
      join public.ingredients_master im on im.id = gc.ingredient_id
      where gc.rarity = v_rarity
    ) weighted
  ) cum
  where cum.cum_weight > v_card_roll * cum.total_weight
  order by cum.cum_weight
  limit 1;

  if v_card_id is null then
    raise exception 'gacha_no_cards';
  end if;

  -- カード付与(初入手ならfirst_acquired_*を記録。消費で0枚になったカードの再入手は「新規」扱いにしない)
  select fc.first_acquired_at into v_prev_acquired_at
  from public.family_cards fc
  where fc.family_id = p_family_id and fc.card_id = v_card_id;

  insert into public.family_cards (family_id, card_id, owned_count, first_acquired_by, first_acquired_at)
  values (p_family_id, v_card_id, 1, v_user, now())
  on conflict (family_id, card_id) do update
    set owned_count = public.family_cards.owned_count + 1,
        first_acquired_by = coalesce(public.family_cards.first_acquired_by, v_user),
        first_acquired_at = coalesce(public.family_cards.first_acquired_at, now())
  returning public.family_cards.owned_count into v_owned;

  insert into public.card_acquisitions (family_id, card_id, acquired_by)
  values (p_family_id, v_card_id, v_user);

  update public.family_game_profile
  set gacha_date = v_today,
      draws_used_today = v_profile.draws_used_today + 1,
      bonus_draws_today = v_profile.bonus_draws_today,
      updated_at = now()
  where family_id = p_family_id;

  return query select
    v_card_id,
    v_prev_acquired_at is null,
    v_owned,
    v_base + v_profile.bonus_draws_today - (v_profile.draws_used_today + 1);
end;
$$;

revoke all on function public.draw_gacha(uuid) from public;
grant execute on function public.draw_gacha(uuid) to authenticated;
