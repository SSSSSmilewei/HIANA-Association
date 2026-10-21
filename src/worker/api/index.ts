import { Router } from "../http";
import { attendanceRoutes } from "./attendance";
import { authRoutes } from "./auth";
import { learningRoutes } from "./learning";
import { memberRoutes } from "./members";
import { noticeRoutes } from "./notices";

/**
 * 网站和手机 App 的全部接口，都在 /api 下。
 * 按板块分文件：登录、签到、导学、公告与比赛、热力图与成员管理。
 */
export const api = new Router();
authRoutes(api);
attendanceRoutes(api);
learningRoutes(api);
noticeRoutes(api);
memberRoutes(api);
