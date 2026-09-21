export const MAX_FAMILY_STORES = 10;

export type FamilyStore = {
  id: string;
  name: string;
  category_order: string[];
  position: number;
};

export type FamilyDefaultItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  position: number;
};
