import type { MatchType } from "@/lib/matching";

export type Triggers = { comment: boolean; story: boolean; dm: boolean };

export type Automation = {
  id: string;
  name: string;
  active: boolean;
  triggers: Triggers;
  keywords: string[];
  match_type: MatchType;
  target_media_id: string | null;
  public_replies: string[];
  welcome_dm: string;
  quick_reply_label: string | null;
  link_text: string | null;
  link_button_label: string | null;
  link_url: string | null;
  reminder_text: string | null;
  reminder_delay_seconds: number;
  created_at: string;
  updated_at: string;
};

export type QueueKind =
  | "private_reply"
  | "welcome"
  | "link"
  | "reminder"
  | "public_reply";

export type RecipientType = "comment_id" | "id" | "comment";
