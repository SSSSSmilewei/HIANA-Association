/**
 * 新生报名（开场动画里的报名表）。网页后台和接口共用的状态名和题目。
 * 题目文字和 intro/src/body.html 里的报名表一致，改的时候两边一起改。
 */

export const APPLICATION_STATUSES = ["new", "contacted", "interview", "accepted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "新报名",
  contacted: "已联系",
  interview: "待面试",
  accepted: "已通过",
  rejected: "未通过",
};

export const APPLICATION_QUESTIONS: { title: string; hint?: string }[] = [
  { title: "你为什么想加入我们的协会？" },
  { title: "在计算机方面，你会哪些技术？", hint: "会哪种写哪种都行。哪怕什么都不会，也不影响最后的考核。" },
  { title: "对大学的发展和未来规划，你有什么想法？", hint: "没关系，哪怕还什么都不知道、没有任何规划，我们也欢迎你来。" },
  { title: "你对计算机科学这门学科有什么认识，对哪里感兴趣？" },
  { title: "你希望在协会里得到些什么？" },
];

/** 招新关闭时，没填提示语就用这一句 */
export const APPLICATIONS_CLOSED_DEFAULT = "本轮招新已结束";

/** 列表里每一行 */
export interface ApplicationSummary {
  id: string;
  studentId: string;
  name: string;
  className: string;
  status: ApplicationStatus;
  submitCount: number;
  createdAt: number;
  updatedAt: number;
}

/** 详情：基本信息、五个回答、管理员备注 */
export interface ApplicationDetail extends ApplicationSummary {
  phone: string;
  qq: string;
  answers: (string | null)[];
  adminNote: string | null;
  handledBy: string | null;
  handledAt: number | null;
}
