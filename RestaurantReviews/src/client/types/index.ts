export interface User {
  id: number;
  name: string;
  email: string;
  blocked: number;
  created_at: string;
}

export interface Restaurant {
  id: number;
  name: string;
  city: string;
  cuisine: string;
  created_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  restaurant_id: number;
  rating: number;
  body: string;
  created_at: string;
}

export interface ReviewWithNames extends Review {
  user_name: string;
  restaurant_name: string;
}

export type TabId =
  | "overview"
  | "cash-register"
  | "missing-number"
  | "morse-code"
  | "on-screen-keyboard"
  | "gilded-rose"
  | "reviews";

export interface Tab {
  id: TabId;
  label: string;
}
