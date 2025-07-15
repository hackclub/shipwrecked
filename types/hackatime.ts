export interface HackatimeProject {
  name: string;
  total_seconds: number;
  hours: number;
  minutes: number;
  text: string;
  digital: string;
  percent: number;
}

export interface HackatimeLanguage {
  name: string;
  total_seconds: number;
  text: string;
  hours: number;
  minutes: number;
  percent: number;
  digital: string;
}

export interface HackatimeStatsData {
  username: string;
  user_id: string;
  is_coding_activity_visible: boolean;
  is_other_usage_visible: boolean;
  status: string;
  start: string;
  end: string;
  range: string;
  human_readable_range: string;
  total_seconds: number;
  daily_average: number;
  human_readable_total: string;
  human_readable_daily_average: string;
}

export interface HackatimeStatsLanguageData extends HackatimeStatsData {
  languages: Array<HackatimeLanguage>;
}

export interface HackatimeStats {
  data: HackatimeStatsData;
}

export interface HackatimeStatsProjectData extends HackatimeStatsData {
  projects: Array<HackatimeProject>;
}

export interface HackatimeStatsProject {
  data: HackatimeStatsProjectData;
}

export interface HacaktimeMostRecentHeartbeat {
  has_heartbeat: boolean,
  heartbeat: unknown
}

export interface HackatimeTrustData {
  trust_level: string;
  suspected: boolean;
  banned: boolean;
  admin_level: string;
  stats: {
    total_heartbeats: number;
    total_coding_time: number;
    languages_used: number;
    projects_worked_on: number;
    days_active: number;
  };
}