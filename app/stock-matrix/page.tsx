"use client"

import StockMatrixPageContent from "./stock-matrix-page-content"
import { ProtectedRoute } from "@/components/protected-route"

export default function StockMatrixPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <StockMatrixPageContent />
    </ProtectedRoute>
  )
}

