"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.userId;
        const [financialSummary] = await database_1.pool.execute(`SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = ?) as total_income,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = ?) as total_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM purchases WHERE user_id = ?) as total_purchases,
        0 as total_sales_revenue,
        0 as total_sales_profit,
        (SELECT COUNT(*) FROM purchases WHERE user_id = ?) as total_purchases_count,
        (SELECT COUNT(*) FROM sales WHERE user_id = ?) as total_sales_count,
        (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE user_id = ?) as total_accounts_balance,
        (SELECT COALESCE(SUM(current_balance), 0) FROM loans WHERE user_id = ? AND status = 'active') as total_active_loans,
        (SELECT COALESCE(SUM(amount_required), 0) FROM charity WHERE user_id = ?) as total_charity_required,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM charity WHERE user_id = ?) as total_charity_paid,
        (SELECT COALESCE(SUM(amount_remaining), 0) FROM charity WHERE user_id = ?) as total_charity_remaining`, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]);
        const summary = financialSummary[0];
        summary.net_worth = parseFloat(summary.total_income) - parseFloat(summary.total_expenses);
        summary.available_cash = parseFloat(summary.total_accounts_balance) - parseFloat(summary.total_active_loans);
        const [monthlyData] = await database_1.pool.execute(`SELECT 
        month_num,
        month_name,
        COALESCE(monthly_income, 0) as monthly_income,
        COALESCE(monthly_expenses, 0) as monthly_expenses,
        COALESCE(monthly_charity, 0) as monthly_charity,
        (COALESCE(monthly_income, 0) - COALESCE(monthly_expenses, 0)) as monthly_profit
       FROM (
         SELECT 
           MONTH(CURDATE()) as current_month,
           m.month_num,
           CASE m.month_num
             WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
             WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
             WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep'
             WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
           END as month_name,
           i.monthly_income,
           e.monthly_expenses,
           c.monthly_charity
         FROM (
           SELECT 1 as month_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 
           UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
         ) m
         LEFT JOIN (
           SELECT MONTH(date) as month, SUM(amount) as monthly_income
           FROM income 
           WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE())
           GROUP BY MONTH(date)
         ) i ON m.month_num = i.month
         LEFT JOIN (
           SELECT MONTH(date) as month, SUM(amount) as monthly_expenses
           FROM expenses 
           WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE())
           GROUP BY MONTH(date)
         ) e ON m.month_num = e.month
         LEFT JOIN (
           SELECT MONTH(payment_date) as month, SUM(amount_paid) as monthly_charity
           FROM charity 
           WHERE user_id = ? AND payment_date IS NOT NULL AND YEAR(payment_date) = YEAR(CURDATE())
           GROUP BY MONTH(payment_date)
         ) c ON m.month_num = c.month
       ) monthly_summary
       ORDER BY month_num`, [userId, userId, userId]);
        const [recentTransactions] = await database_1.pool.execute(`SELECT 
        id, transaction_type, amount, description, date, created_at,
        reference_table, reference_id
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`, [userId]);
        const [topExpenseCategories] = await database_1.pool.execute(`SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        ROUND((SUM(amount) / (SELECT SUM(amount) FROM expenses WHERE user_id = ?)) * 100, 2) as percentage
       FROM expenses 
       WHERE user_id = ? 
       GROUP BY category 
       ORDER BY total_amount DESC 
       LIMIT 5`, [userId, userId]);
        const [trendData] = await database_1.pool.execute(`SELECT 
        DATE_FORMAT(month_year, '%Y-%m') as month,
        DATE_FORMAT(month_year, '%b %Y') as month_label,
        COALESCE(income_amount, 0) as income,
        COALESCE(expense_amount, 0) as expenses
       FROM (
         SELECT DATE_FORMAT(CURDATE() - INTERVAL n MONTH, '%Y-%m-01') as month_year
         FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) months
       ) calendar
       LEFT JOIN (
         SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as income_amount
         FROM income 
         WHERE user_id = ? 
         GROUP BY DATE_FORMAT(date, '%Y-%m')
       ) income_data ON DATE_FORMAT(calendar.month_year, '%Y-%m') = income_data.month
       LEFT JOIN (
         SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as expense_amount
         FROM expenses 
         WHERE user_id = ? 
         GROUP BY DATE_FORMAT(date, '%Y-%m')
       ) expense_data ON DATE_FORMAT(calendar.month_year, '%Y-%m') = expense_data.month
       ORDER BY month_year DESC`, [userId, userId]);
        const [charityOverview] = await database_1.pool.execute(`SELECT 
        status,
        COUNT(*) as count,
        SUM(amount_required) as total_required,
        SUM(amount_paid) as total_paid,
        SUM(amount_remaining) as total_remaining
       FROM charity 
       WHERE user_id = ? 
       GROUP BY status`, [userId]);
        res.json({
            success: true,
            data: {
                summary,
                monthly_data: monthlyData,
                recent_transactions: recentTransactions,
                top_expense_categories: topExpenseCategories,
                trend_data: trendData.reverse(),
                charity_overview: charityOverview
            }
        });
    }
    catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/analytics', [
    (0, express_validator_1.query)('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
    (0, express_validator_1.query)('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
    (0, express_validator_1.query)('time_range').optional().isIn(['3months', '6months', '12months', '24months']).withMessage('Invalid time range')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const userId = req.user.userId;
        const period = req.query.period || 'month';
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const timeRange = req.query.time_range;
        let dateFilter = '';
        let groupBy = '';
        let dateFormat = '';
        if (timeRange) {
            let intervalMonths = 0;
            switch (timeRange) {
                case '3months':
                    intervalMonths = 3;
                    break;
                case '6months':
                    intervalMonths = 6;
                    break;
                case '12months':
                    intervalMonths = 12;
                    break;
                case '24months':
                    intervalMonths = 24;
                    break;
            }
            dateFilter = `AND date >= DATE_SUB(CURDATE(), INTERVAL ${intervalMonths} MONTH)`;
            groupBy = 'YEAR(date), MONTH(date)';
            dateFormat = 'DATE_FORMAT(date, "%Y-%m")';
        }
        else {
            switch (period) {
                case 'week':
                    dateFilter = `AND YEAR(date) = ${year} AND WEEK(date) >= WEEK(CURDATE()) - 12`;
                    groupBy = 'YEAR(date), WEEK(date)';
                    dateFormat = 'CONCAT(YEAR(date), "-W", LPAD(WEEK(date), 2, "0"))';
                    break;
                case 'quarter':
                    dateFilter = `AND YEAR(date) = ${year}`;
                    groupBy = 'YEAR(date), QUARTER(date)';
                    dateFormat = 'CONCAT(YEAR(date), "-Q", QUARTER(date))';
                    break;
                case 'year':
                    dateFilter = `AND YEAR(date) >= ${year - 4}`;
                    groupBy = 'YEAR(date)';
                    dateFormat = 'YEAR(date)';
                    break;
                default:
                    dateFilter = `AND date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`;
                    groupBy = 'YEAR(date), MONTH(date)';
                    dateFormat = 'DATE_FORMAT(date, "%Y-%m")';
            }
        }
        const [incomeAnalytics] = await database_1.pool.execute(`SELECT 
        ${dateFormat} as period,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as average_amount,
        category,
        SUM(charity_required) as charity_generated
       FROM income 
       WHERE user_id = ? ${dateFilter}
       GROUP BY ${groupBy}, category
       ORDER BY period, total_amount DESC`, [userId]);
        const [expenseAnalytics] = await database_1.pool.execute(`SELECT 
        ${dateFormat} as period,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as average_amount,
        category
       FROM expenses 
       WHERE user_id = ? ${dateFilter}
       GROUP BY ${groupBy}, category
       ORDER BY period, total_amount DESC`, [userId]);
        const [profitAnalysis] = await database_1.pool.execute(`SELECT
        all_periods.period,
        COALESCE(income_data.total_income, 0) as income,
        COALESCE(expenses_data.total_expenses, 0) as expenses,
        (COALESCE(income_data.total_income, 0) - COALESCE(expenses_data.total_expenses, 0)) as profit,
        CASE
            WHEN COALESCE(income_data.total_income, 0) > 0
            THEN ROUND(((COALESCE(income_data.total_income, 0) - COALESCE(expenses_data.total_expenses, 0)) / income_data.total_income) * 100, 2)
            ELSE 0
        END as profit_margin
       FROM (
           SELECT DISTINCT ${dateFormat} as period
           FROM income
           WHERE user_id = ? ${dateFilter}
           UNION
           SELECT DISTINCT ${dateFormat} as period
           FROM expenses
           WHERE user_id = ? ${dateFilter}
       ) as all_periods
       LEFT JOIN (
           SELECT ${dateFormat} as period, SUM(amount) as total_income
           FROM income
           WHERE user_id = ? ${dateFilter}
           GROUP BY ${groupBy}
       ) as income_data ON all_periods.period = income_data.period
       LEFT JOIN (
           SELECT ${dateFormat} as period, SUM(amount) as total_expenses
           FROM expenses
           WHERE user_id = ? ${dateFilter}
           GROUP BY ${groupBy}
       ) as expenses_data ON all_periods.period = expenses_data.period
       ORDER BY all_periods.period`, [userId, userId, userId, userId]);
        res.json({
            success: true,
            data: {
                period,
                year,
                income_analytics: incomeAnalytics,
                expense_analytics: expenseAnalytics,
                profit_analysis: profitAnalysis
            }
        });
    }
    catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/metrics', async (req, res) => {
    try {
        const userId = req.user.userId;
        const [kpiMetrics] = await database_1.pool.execute(`SELECT 
        -- Revenue metrics
        (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as revenue_30d,
        (SELECT COALESCE(SUM(amount), 0) FROM income WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as revenue_90d,
        
        -- Expense metrics
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as expenses_30d,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as expenses_90d,
        
        -- Growth metrics
        (SELECT COALESCE(AVG(amount), 0) FROM income WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as avg_income_30d,
        (SELECT COALESCE(AVG(amount), 0) FROM expenses WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as avg_expense_30d,
        
        -- Charity metrics
        (SELECT COALESCE(SUM(amount_paid), 0) FROM charity WHERE user_id = ? AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as charity_paid_30d,
        (SELECT COALESCE(SUM(amount_remaining), 0) FROM charity WHERE user_id = ? AND status != 'paid') as charity_pending,
        
        -- Account metrics
        (SELECT COUNT(*) FROM accounts WHERE user_id = ?) as total_accounts,
        (SELECT COUNT(*) FROM loans WHERE user_id = ? AND status = 'active') as active_loans`, [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]);
        const metrics = kpiMetrics[0];
        metrics.profit_30d = parseFloat(metrics.revenue_30d) - parseFloat(metrics.expenses_30d);
        metrics.profit_90d = parseFloat(metrics.revenue_90d) - parseFloat(metrics.expenses_90d);
        metrics.burn_rate = parseFloat(metrics.expenses_30d) / 30;
        metrics.charity_compliance = parseFloat(metrics.charity_pending) === 0 ? 100 :
            ((parseFloat(metrics.charity_paid_30d) / (parseFloat(metrics.charity_paid_30d) + parseFloat(metrics.charity_pending))) * 100);
        const [trendComparison] = await database_1.pool.execute(`SELECT 
        'current_month' as period,
        COALESCE(SUM(CASE WHEN table_name = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN table_name = 'expenses' THEN amount ELSE 0 END), 0) as expenses
       FROM (
         SELECT 'income' as table_name, amount FROM income 
         WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
         UNION ALL
         SELECT 'expenses' as table_name, amount FROM expenses 
         WHERE user_id = ? AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
       ) current_data
       
       UNION ALL
       
       SELECT 
        'previous_month' as period,
        COALESCE(SUM(CASE WHEN table_name = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN table_name = 'expenses' THEN amount ELSE 0 END), 0) as expenses
       FROM (
         SELECT 'income' as table_name, amount FROM income 
         WHERE user_id = ? AND date >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE()) - 1 DAY), INTERVAL 1 MONTH)
               AND date < DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE()) - 1 DAY)
         UNION ALL
         SELECT 'expenses' as table_name, amount FROM expenses 
         WHERE user_id = ? AND date >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE()) - 1 DAY), INTERVAL 1 MONTH)
               AND date < DATE_SUB(CURDATE(), INTERVAL DAY(CURDATE()) - 1 DAY)
       ) previous_data`, [userId, userId, userId, userId]);
        const currentMonth = trendComparison.find((t) => t.period === 'current_month') || { income: 0, expenses: 0 };
        const previousMonth = trendComparison.find((t) => t.period === 'previous_month') || { income: 0, expenses: 0 };
        const incomeGrowthRate = previousMonth.income > 0 ?
            ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0;
        const expenseGrowthRate = previousMonth.expenses > 0 ?
            ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 : 0;
        res.json({
            success: true,
            data: {
                kpi_metrics: metrics,
                growth_rates: {
                    income_growth: Math.round(incomeGrowthRate * 100) / 100,
                    expense_growth: Math.round(expenseGrowthRate * 100) / 100
                },
                trend_comparison: {
                    current_month: currentMonth,
                    previous_month: previousMonth
                }
            }
        });
    }
    catch (error) {
        console.error('Dashboard metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
