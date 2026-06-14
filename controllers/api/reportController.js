const Goal = require('../../models/goal');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const { calculateProgress, getDateRangeQuery, getScopedGoalQuery } = require('../../utils/goalUtils');

const buildReportQuery = async (req) => {
  const scopedQuery = await getScopedGoalQuery(req.user);
  const query = { ...scopedQuery, ...getDateRangeQuery({ from: req.query.from, to: req.query.to }) };
  if (req.query.employeeId) {
    query.employeeId = req.query.employeeId;
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.status) {
    if (['Approved', 'Pending', 'Rejected'].includes(req.query.status)) {
      query.approvalStatus = req.query.status;
    } else {
      query.status = req.query.status;
    }
  }
  return query;
};

const formatGoal = (goal) => ({
  employeeName: goal.employeeId?.name || 'Unknown',
  department: goal.employeeId?.department || 'General',
  title: goal.title,
  category: goal.category || 'Productivity',
  priority: goal.priority || 'Medium',
  dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString().slice(0, 10) : '',
  target: goal.target,
  achievement: goal.achievement,
  progress: calculateProgress(goal),
  status: goal.status,
  approvalStatus: goal.approvalStatus,
  managerComment: goal.managerComment || ''
});

exports.downloadCsv = async (req, res) => {
  const goals = await Goal.find(await buildReportQuery(req)).populate('employeeId', 'name department').lean();
  const data = goals.map(formatGoal);
  const parser = new Parser({ fields: ['employeeName', 'department', 'title', 'category', 'priority', 'dueDate', 'target', 'achievement', 'progress', 'status', 'approvalStatus', 'managerComment'] });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('goal-report.csv');
  res.send(csv);
};

exports.downloadExcel = async (req, res) => {
  const goals = await Goal.find(await buildReportQuery(req)).populate('employeeId', 'name department').lean();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Goals');
  sheet.columns = [
    { header: 'Employee', key: 'employee', width: 26 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Priority', key: 'priority', width: 14 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Target', key: 'target', width: 12 },
    { header: 'Achievement', key: 'achievement', width: 14 },
    { header: 'Progress', key: 'progress', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Approval', key: 'approvalStatus', width: 14 },
    { header: 'Manager Comment', key: 'managerComment', width: 28 }
  ];
  goals.forEach((goal) => {
    const row = formatGoal(goal);
    sheet.addRow({
      employee: row.employeeName,
      department: row.department,
      title: row.title,
      category: row.category,
      priority: row.priority,
      dueDate: row.dueDate,
      target: row.target,
      achievement: row.achievement,
      progress: row.progress,
      status: row.status,
      approvalStatus: row.approvalStatus,
      managerComment: row.managerComment
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=goal-report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};
