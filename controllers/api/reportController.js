const Goal = require('../../models/goal');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const { calculateProgress, getScopedGoalQuery } = require('../../utils/goalUtils');

exports.downloadCsv = async (req, res) => {
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId', 'name').lean();
  const data = goals.map((goal) => ({
    employeeName: goal.employeeId?.name || 'Unknown',
    title: goal.title,
    target: goal.target,
    achievement: goal.achievement,
    progress: calculateProgress(goal),
    status: goal.status
  }));
  const parser = new Parser({ fields: ['employeeName', 'title', 'target', 'achievement', 'progress', 'status'] });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('goal-report.csv');
  res.send(csv);
};

exports.downloadExcel = async (req, res) => {
  const goals = await Goal.find(await getScopedGoalQuery(req.user)).populate('employeeId', 'name').lean();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Goals');
  sheet.columns = [
    { header: 'Employee', key: 'employee', width: 26 },
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
