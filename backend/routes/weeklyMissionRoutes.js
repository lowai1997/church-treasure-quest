import express from 'express';
import WeeklyMission from '../models/WeeklyMission.js';
import WeeklyMissionReport from '../models/WeeklyMissionReport.js';
import Player from '../models/Player.js';
import { requireRole, verifyToken } from '../middleware/auth.js';

const router = express.Router();
const hkOffsetMilliseconds = 8 * 60 * 60 * 1000;

const toNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const sanitizeText = (value, fallback, maxLength) => {
  const text = String(value || '').trim().slice(0, maxLength);
  return text || fallback;
};

const getWeekKey = (date = new Date()) => {
  const hkDate = new Date(date.getTime() + hkOffsetMilliseconds);
  const day = hkDate.getUTCDay() || 7;
  hkDate.setUTCDate(hkDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(hkDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((hkDate - yearStart) / 86400000 + 1) / 7);
  return `${hkDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const publicMission = (mission) => ({
  _id: mission._id.toString(),
  title: mission.title,
  content: mission.content,
  reward: Number(mission.reward || 0),
  active: Boolean(mission.active),
  repeatWeekly: Boolean(mission.repeatWeekly),
  createdByName: mission.createdByName || '',
  createdAt: mission.createdAt ? mission.createdAt.toISOString() : null,
  updatedAt: mission.updatedAt ? mission.updatedAt.toISOString() : null
});

const publicReport = (report) => ({
  _id: report._id.toString(),
  mission: report.mission?._id?.toString?.() || report.mission?.toString?.() || '',
  missionTitle: report.mission?.title || '',
  player: report.player?._id?.toString?.() || report.player?.toString?.() || '',
  playerName: report.playerName,
  weekKey: report.weekKey,
  status: report.status,
  reward: Number(report.reward || 0),
  reportedAt: report.reportedAt ? report.reportedAt.toISOString() : null,
  reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
  reviewedByName: report.reviewedByName || '',
  claimedAt: report.claimedAt ? report.claimedAt.toISOString() : null
});

router.get('/weeklyMissions', verifyToken, async (req, res, next) => {
  try {
    const weekKey = getWeekKey();
    const missionFilter = req.user.role === 'teacher' ? {} : { active: true };
    const missions = await WeeklyMission.find(missionFilter).sort({ active: -1, updatedAt: -1, createdAt: -1 });
    const missionIds = missions.map((mission) => mission._id);
    const reportFilter =
      req.user.role === 'teacher'
        ? { mission: { $in: missionIds }, weekKey, status: { $in: ['pending', 'approved'] } }
        : { mission: { $in: missionIds }, weekKey, player: req.user._id, status: { $in: ['pending', 'approved'] } };
    const reports = await WeeklyMissionReport.find(reportFilter)
      .populate('mission', 'title')
      .sort({ reportedAt: -1 });
    const reportByMission = new Map(reports.map((report) => [report.mission?._id?.toString?.() || report.mission.toString(), report]));

    return res.json({
      weekKey,
      missions: missions.map((mission) => ({
        ...publicMission(mission),
        myReport: req.user.role === 'student' && reportByMission.has(mission._id.toString())
          ? publicReport(reportByMission.get(mission._id.toString()))
          : null
      })),
      reports: req.user.role === 'teacher' ? reports.map(publicReport) : []
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/weeklyMissions', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const mission = await WeeklyMission.create({
      title: sanitizeText(req.body.title, '每週任務', 80),
      content: sanitizeText(req.body.content, '請完成本週指定任務。', 800),
      reward: Math.min(999999, toNonNegativeInteger(req.body.reward, 100)),
      active: req.body.active !== false,
      repeatWeekly: true,
      createdBy: req.user._id,
      createdByName: req.user.name
    });

    return res.json({
      message: '每週任務已建立。',
      mission: publicMission(mission)
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/weeklyMissions/:missionId', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const mission = await WeeklyMission.findById(req.params.missionId);

    if (!mission) {
      return res.status(404).json({ message: '找不到此每週任務。' });
    }

    if (req.body.title !== undefined) {
      mission.title = sanitizeText(req.body.title, mission.title, 80);
    }

    if (req.body.content !== undefined) {
      mission.content = sanitizeText(req.body.content, mission.content, 800);
    }

    if (req.body.reward !== undefined) {
      mission.reward = Math.min(999999, toNonNegativeInteger(req.body.reward, mission.reward));
    }

    if (req.body.active !== undefined) {
      mission.active = Boolean(req.body.active);
    }

    await mission.save();

    return res.json({
      message: '每週任務已更新。',
      mission: publicMission(mission)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/weeklyMissions/:missionId', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const mission = await WeeklyMission.findById(req.params.missionId);

    if (!mission) {
      return res.status(404).json({ message: '找不到此每週任務。' });
    }

    await WeeklyMissionReport.deleteMany({ mission: mission._id });
    await mission.deleteOne();

    return res.json({
      message: '每週任務已移除。'
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/weeklyMissions/:missionId/report', verifyToken, requireRole('student'), async (req, res, next) => {
  try {
    const mission = await WeeklyMission.findOne({ _id: req.params.missionId, active: true });

    if (!mission) {
      return res.status(404).json({ message: '找不到可回報的每週任務。' });
    }

    const weekKey = getWeekKey();
    await WeeklyMissionReport.deleteMany({
      mission: mission._id,
      player: req.user._id,
      weekKey,
      status: 'rejected'
    });

    const existingReport = await WeeklyMissionReport.findOne({
      mission: mission._id,
      player: req.user._id,
      weekKey,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingReport) {
      const message =
        existingReport.status === 'approved'
          ? '你本週已完成此任務。'
          : '你本週已回報過此任務，請等待導師審核。';
      return res.status(400).json({ message });
    }

    const report = await WeeklyMissionReport.create({
      mission: mission._id,
      player: req.user._id,
      playerName: req.user.name,
      weekKey,
      reward: Number(mission.reward || 0)
    });

    await report.populate('mission', 'title');

    return res.json({
      message: '已回報完成，請等待導師審核發獎。',
      report: publicReport(report)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '你本週已回報過此任務。' });
    }

    return next(error);
  }
});

router.post('/weeklyMissionReports/:reportId/approve', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const report = await WeeklyMissionReport.findById(req.params.reportId).populate('mission', 'title');

    if (!report) {
      return res.status(404).json({ message: '找不到此回報。' });
    }

    if (report.status === 'approved') {
      return res.json({ message: '此回報已審核通過。', report: publicReport(report) });
    }

    const player = await Player.findById(report.player);

    if (!player) {
      return res.status(404).json({ message: '找不到回報的團員。' });
    }

    report.status = 'approved';
    report.reviewedAt = new Date();
    report.reviewedBy = req.user._id;
    report.reviewedByName = req.user.name;

    if (!report.claimedAt) {
      player.gold += Number(report.reward || 0);
      report.claimedAt = new Date();
      await player.save();
    }

    await report.save();

    return res.json({
      message: `已通過回報並發放 ${report.reward} Token（金幣）。`,
      report: publicReport(report)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/weeklyMissionReports/:reportId/reject', verifyToken, requireRole('teacher'), async (req, res, next) => {
  try {
    const report = await WeeklyMissionReport.findById(req.params.reportId).populate('mission', 'title');

    if (!report) {
      return res.status(404).json({ message: '找不到此回報。' });
    }

    if (report.status === 'approved') {
      return res.status(400).json({ message: '已發獎的回報不能改為未通過。' });
    }

    const resetReport = publicReport(report);
    await report.deleteOne();

    return res.json({
      message: '已退回回報，團員可以重新完成並提交此任務。',
      report: resetReport,
      reset: true
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
