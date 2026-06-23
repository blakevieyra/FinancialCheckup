import { CHECKUP_FEATURES } from './checkupConstants';

/** Pricing copy aligned with https://operone2i.com/financialcheckup */
export const PLAN_PRICING = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    tagline: 'Run a full checkup today',
    cta: null,
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    period: '/month',
    tagline: 'Unlimited access, cancel anytime',
    badge: 'Most popular',
    cta: 'Start monthly plan',
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    price: '$96',
    period: '/year',
    tagline: 'Only $8/mo — save $24 vs monthly',
    badge: 'Save $24',
    cta: 'Start annual plan',
  },
};

/** Rows for the plan comparison table — matches marketing site + in-app Pro tools */
export const PLAN_COMPARISON = [
  { label: '6-dimension financial health score', free: true, pro: true },
  { label: 'Budget gap analysis & spending charts', free: true, pro: true },
  { label: 'Debt payoff planner', free: true, pro: true },
  { label: 'Top prioritized recommendations', free: true, pro: true },
  { label: 'Unlimited monthly checkups', free: false, pro: true },
  { label: 'Full action plan (all priorities)', free: false, pro: true },
  { label: 'Score history & trend tracking', free: false, pro: true },
  { label: 'Step-by-step improvement roadmap', free: false, pro: true },
  { label: 'Investment portfolio guidance', free: 'Basic', pro: true },
  { label: 'Insurance & retirement trajectory', free: 'Basic', pro: true },
  { label: 'AI insights & expert briefing', free: false, pro: true },
  { label: 'PDF & CSV report exports', free: false, pro: true },
  { label: 'Goals & progress tracking', free: false, pro: true },
  { label: '3 / 6 / 12 month forecasts', free: false, pro: true },
  { label: 'Business accounting documents', free: false, pro: true },
  { label: 'Community spending compare', free: false, pro: true },
  { label: 'Weekly email / SMS digest', free: false, pro: true },
  { label: 'Priority email support', free: false, pro: 'Annual' },
  { label: 'Early access to new features', free: false, pro: 'Annual' },
];

export const CHECKUP_DIMENSIONS = CHECKUP_FEATURES;

/** Tool cards shown on the More tab — every major app capability */
export const MORE_TOOL_SECTIONS = [
  {
    id: 'reports',
    title: 'Reports & exports',
    intro: 'Professional, branded exports for advisors, taxes, lenders, or personal records — with confidentiality notices and legal disclosures.',
    pro: true,
    tools: [
      { id: 'csv', label: 'Export CSV', desc: 'Detailed ledger export with scores, categories, and metadata' },
      { id: 'pdf', label: 'Executive PDF', desc: 'Branded scorecard with KPIs, trends, and legal disclosures' },
      { id: 'bizpdf', label: 'Business docs PDF', desc: 'Formal balance sheet, income statement & cash flow' },
    ],
  },
  {
    id: 'ai',
    title: 'AI & personalized advice',
    intro: 'Data-driven insights tailored to your profile — personal, business, or organizational.',
    pro: true,
    tools: [],
  },
];

export const RESOURCE_LINKS = {
  personal: [
    { label: 'Consumer Financial Protection Bureau (CFPB)', href: 'https://www.consumerfinance.gov/' },
    { label: 'USA.gov Money & Credit', href: 'https://www.usa.gov/money' },
    { label: 'FTC fraud resources', href: 'https://www.ftc.gov/' },
    { label: 'AnnualCreditReport.com', href: 'https://www.annualcreditreport.com/' },
    { label: 'IRS tax guidance', href: 'https://www.irs.gov/' },
  ],
  business: [
    { label: 'U.S. Small Business Administration (SBA)', href: 'https://www.sba.gov/' },
    { label: 'SCORE mentoring', href: 'https://www.score.org/' },
    { label: 'IRS business tax center', href: 'https://www.irs.gov/businesses' },
    { label: 'Grants.gov', href: 'https://www.grants.gov/' },
    { label: 'SBDC local centers', href: 'https://www.sba.gov/local-assistance/resource-partners/small-business-development-centers-sbdc' },
  ],
};
