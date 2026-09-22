// AI関連機能(新レシピ提案・献立提案・レシピURL自動抽出)の利用許可が
// 無いユーザーに表示する案内。
export function AiFeatureLockedNotice() {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
      🔒 この機能の利用には管理者の許可が必要です。利用したい場合は管理者にご連絡ください。
    </div>
  );
}
