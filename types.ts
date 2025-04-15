export type Employee = {
  id: string
  firstName: string
  lastName: string
  documentId: string
  position: string
  local: string
  hireDate: string
  terminationDate?: string
  status: string
}

export type Payroll = {
  id: string
  employeeId: string
  month: number
  year: number
  baseSalary: number
  bankSalary: number
  handSalary: number
  deductions: number
  additions: number
  finalHandSalary: number
  totalSalary: number
  isPaid: boolean
  handSalaryPaid: boolean
  bankSalaryPaid: boolean
  paymentDate?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  details?: PayrollDetail[]
  createdAt: string
  updatedAt: string
}

export type PayrollDetail = {
  id: string
  payrollId: string
  concept: string
  type: "addition" | "deduction"
  amount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type Liquidation = {
  id: string
  employeeId: string
  terminationDate: string
  workedDays: number
  workedMonths: number
  daysToPayInLastMonth?: number
  baseSalary: number
  // Eliminamos lastMonthSalary que no existe en la base de datos
  proportionalVacation: number
  proportionalBonus: number
  compensationAmount: number
  totalAmount: number
  isPaid: boolean
  includeVacation?: boolean
  includeBonus?: boolean
  paymentDate?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export type Audit = {
  id: string
  localId: string
  localName: string
  auditor: string
  auditorName?: string
  date: string
  shift: string
  notes?: string
  observations?: string
  generalObservations?: string
  items?: AuditItem[]
  totalScore: number
  maxScore: number
  percentage: number
  type: "rapida" | "detallada"
  categories?: AuditCategory[]
  managerName?: string
}

export type AuditItem = {
  id: string
  name: string
  value: number
  completed: boolean
  category: string
  score?: number
  maxScore?: number
  observations?: string
}

export type AuditCategory = {
  id: string
  name: string
  score: number
  maxScore: number
  items: AuditItem[]
}

export type Balance = {
  id: string
  local: string
  month: number
  year: number
  counterSales: number
  deliverySales: number
  totalIncome: number
  payrollExpenses: number
  rentExpenses: number
  maintenanceExpenses: number
  suppliesExpenses: number
  repairsExpenses: number
  otherExpenses: number
  totalExpenses: number
  netProfit: number
}

export type Order = {
  id: string
  date: string
  local: string
  localName?: string
  clientName?: string
  clientPhone?: string
  clientAddress?: string
  items: OrderItem[]
  total: number
  notes?: string
  observations?: string
  status: string
  createdAt?: string
}

export type OrderItem = {
  id: string
  orderId: string
  productName: string
  quantity: number
  price: number
}




