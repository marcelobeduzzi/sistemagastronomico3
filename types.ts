// Agregar estos tipos al archivo types.ts existente

export interface Payroll {
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

export interface PayrollDetail {
  id: string
  payrollId: string
  concept: string
  type: "addition" | "deduction"
  amount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Liquidation {
  id: string
  employeeId: string
  terminationDate: string
  workedDays: number
  workedMonths: number
  baseSalary: number
  proportionalVacation: number
  proportionalBonus: number
  compensationAmount: number
  totalAmount: number
  isPaid: boolean
  paymentDate?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

