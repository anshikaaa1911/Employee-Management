const User = require('../models/user');
const Goal = require('../models/goal');
const AuditLog = require('../models/auditLog');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const { calculateProgress, getActivePhase, getScopedGoalQuery } = require('../utils/goalUtils');

exports.homePage = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('home', { user: null });
};

exports.dashboard = async (req, res) => {
  const activePhase = getActivePhase();
  const counts = { goals: 0, approvals: 0, shared: 0 };
  const goals = await Goal.find({ employeeId: req.user._id }).lean();
  counts.goals = goals.length;
  counts.approvals = goals.filter((g) => g.approvalStatus === 'Approved').length;
  counts.shared = goals.filter((g) => g.isShared).length;
  res.render('dashboard', { user: req.user, goals, counts, activePhase });
};

exports.reportPage = async (req, res) => {
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId').lean();
  goals.forEach((goal) => {
    goal.progress = calculateProgress(goal);
  });
  res.render('reports', { user: req.user, goals });
};

exports.downloadCsv = async (req, res) => {
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId').lean();
  const fields = ['employeeName', 'title', 'target', 'achievement', 'progress', 'status'];
  const data = goals.map((goal) => ({
    employeeName: goal.employeeId?.name || 'Unknown',
    title: goal.title,
    target: goal.target,
    achievement: goal.achievement,
    progress: calculateProgress(goal),
    status: goal.status
  }));
  const parser = new Parser({ fields });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('goal-report.csv');
  res.send(csv);
};

exports.downloadExcel = async (req, res) => {
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId').lean();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Goals');
  sheet.columns = [
    { header: 'Employee', key: 'employee', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Target', key: 'target', width: 12 },
    { header: 'Achievement', key: 'achievement', width: 14 },
    { header: 'Progress', key: 'progress', width: 12 },
    { header: 'Status', key: 'status', width: 14 }
  ];
  goals.forEach((goal) => {
    sheet.addRow({
      employee: goal.employeeId?.name || 'Unknown',
      title: goal.title,
      target: goal.target,
      achievement: goal.achievement,
      progress: calculateProgress(goal),
      status: goal.status
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=goal-report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};
