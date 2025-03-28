import type { Employee, Payroll, Audit, Balance, Order } from "@/types"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

// Función para exportar a CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    console.error("No hay datos para exportar")
    return
  }

  // Obtener encabezados
  const headers = Object.keys(data[0])

  // Crear contenido CSV
  const csvContent = [
    headers.join(","), // Encabezados
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Manejar valores especiales
          if (value === null || value === undefined) return ""
          if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          return value
        })
        .join(","),
    ),
  ].join("\n")

  // Crear blob y descargar
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Función para exportar a PDF
export const exportToPDF = (
  data: any[],
  title: string,
  filename: string,
  columns?: { header: string; dataKey: string }[],
) => {
  try {
    const doc = new jsPDF()

    // Título
    doc.setFontSize(18)
    doc.text(title, 14, 22)

    // Fecha
    doc.setFontSize(11)
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 14, 30)

    // Si no se proporcionan columnas, generarlas automáticamente
    if (!columns && data.length > 0) {
      columns = Object.keys(data[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        dataKey: key,
      }))
    }

    // Crear tabla
    doc.autoTable({
      startY: 40,
      head: [columns?.map((col) => col.header) || []],
      body: data.map((item) => columns?.map((col) => item[col.dataKey]) || []),
      theme: "grid",
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    // Guardar PDF
    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error("Error al exportar a PDF:", error)
    alert("Ocurrió un error al exportar a PDF. Por favor, intente nuevamente.")
  }
}

// Función para formatear fecha - MODIFICADA para trabajar directamente con strings
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-"

  // Si la fecha incluye tiempo (formato ISO), extraer solo la parte de la fecha
  if (dateString.includes("T")) {
    dateString = dateString.split("T")[0]
  }

  // Verificar si la fecha está en formato YYYY-MM-DD
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (isoDateRegex.test(dateString)) {
    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const parts = dateString.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
  }

  // Si no está en formato YYYY-MM-DD, intentar con el método anterior como fallback
  try {
    const date = new Date(dateString)
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return dateString // Devolver el string original si no es una fecha válida
    }
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch (error) {
    console.error("Error al formatear fecha:", error)
    return dateString // Devolver el string original en caso de error
  }
}

// Función para formatear moneda
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

// Función para calcular días trabajados
export const calculateWorkedDays = (hireDate: string, terminationDate?: string): number => {
  const start = new Date(hireDate)
  const end = terminationDate ? new Date(terminationDate) : new Date()

  // Calcular diferencia en milisegundos
  const diffTime = Math.abs(end.getTime() - start.getTime())

  // Convertir a días
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// Función para generar recibo de sueldo en PDF
export const generatePayslip = (payroll: Payroll, employee: Employee) => {
  try {
    const doc = new jsPDF()

    // Encabezado
    doc.setFontSize(18)
    doc.text("RECIBO DE SUELDO", 105, 20, { align: "center" })

    // Información de la empresa
    doc.setFontSize(12)
    doc.text("Quadrifoglio S.A.", 14, 30)
    doc.text("CUIT: 30-12345678-9", 14, 35)
    doc.text("Av. Corrientes 1234, CABA", 14, 40)

    // Información del empleado
    doc.text("INFORMACIÓN DEL EMPLEADO", 14, 50)
    doc.line(14, 51, 196, 51)

    doc.text(`Nombre: ${employee.firstName} ${employee.lastName}`, 14, 60)
    doc.text(`DNI: ${employee.documentId}`, 14, 65)
    doc.text(`Cargo: ${employee.position}`, 14, 70)
    doc.text(`Local: ${employee.local}`, 14, 75)
    doc.text(`Fecha de ingreso: ${formatDate(employee.hireDate)}`, 14, 80)

    // Información del período
    doc.text("PERÍODO", 14, 90)
    doc.line(14, 91, 196, 91)

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    doc.text(`Mes: ${monthNames[payroll.month - 1]} ${payroll.year}`, 14, 100)

    // Detalle de haberes y deducciones
    doc.text("DETALLE DE HABERES Y DEDUCCIONES", 14, 110)
    doc.line(14, 111, 196, 111)

    // Tabla de conceptos
    const tableColumn = ["Concepto", "Tipo", "Monto"]
    const tableRows = [
      ["Sueldo Base", "Haber", formatCurrency(payroll.baseSalary)],
      ["Sueldo Banco", "Haber", formatCurrency(payroll.bankSalary)],
    ]

    // Agregar deducciones
    payroll.details.forEach((detail) => {
      if (detail.type === "deduction") {
        tableRows.push([detail.concept, "Deducción", `- ${formatCurrency(detail.amount)}`])
      }
    })

    // Agregar adiciones
    payroll.details.forEach((detail) => {
      if (detail.type === "addition") {
        tableRows.push([detail.concept, "Adición", formatCurrency(detail.amount)])
      }
    })

    // Totales
    tableRows.push(
      ["TOTAL DEDUCCIONES", "", `- ${formatCurrency(payroll.deductions)}`],
      ["TOTAL ADICIONES", "", formatCurrency(payroll.additions)],
      ["SUELDO EN MANO FINAL", "", formatCurrency(payroll.finalHandSalary)],
      ["SUELDO TOTAL", "", formatCurrency(payroll.totalSalary)],
    )

    doc.autoTable({
      startY: 115,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: "bold",
      },
    })

    // Firmas
    const finalY = (doc as any).lastAutoTable.finalY + 20

    doc.text("_______________________", 40, finalY)
    doc.text("_______________________", 150, finalY)

    doc.text("Firma del Empleado", 40, finalY + 10)
    doc.text("Firma del Empleador", 150, finalY + 10)

    // Guardar PDF
    doc.save(`Recibo_${employee.firstName}_${employee.lastName}_${payroll.month}_${payroll.year}.pdf`)
  } catch (error) {
    console.error("Error al generar recibo de sueldo:", error)
    alert("Ocurrió un error al generar el recibo de sueldo. Por favor, intente nuevamente.")
  }
}

// Define the AuditItem type
interface AuditItem {
  name: string
  value: number
  completed: boolean
  category: string
}

// Función para generar reporte de auditoría en PDF
export const generateAuditReport = (audit: Audit) => {
  try {
    const doc = new jsPDF()

    // Encabezado
    doc.setFontSize(18)
    doc.text("REPORTE DE AUDITORÍA", 105, 20, { align: "center" })

    // Información general
    doc.setFontSize(12)
    doc.text(`Local: ${audit.localName || audit.local}`, 14, 30)
    doc.text(`Fecha: ${formatDate(audit.date)}`, 14, 35)
    doc.text(`Auditor: ${audit.auditor || audit.supervisorName}`, 14, 40)
    
    // Verificar si existe el campo shift
    if (audit.shift) {
      doc.text(`Turno: ${audit.shift === "morning" ? "Mañana" : audit.shift === "afternoon" ? "Tarde" : "Noche"}`, 14, 45)
      doc.text(`Encargado: ${audit.managerName || ""}`, 14, 50)
      doc.text(`Puntaje Total: ${audit.totalScore} / ${audit.maxScore || 150}`, 14, 55)
    } else {
      // Si no existe shift, es el nuevo formato de auditoría
      doc.text(`Puntaje Total: ${audit.totalScore} / ${audit.maxScore}`, 14, 45)
      doc.text(`Porcentaje: ${audit.percentage}%`, 14, 50)
    }

    let yPos = 60

    // Verificar si tiene el campo categories (nuevo formato)
    if (audit.categories && audit.categories.length > 0) {
      // Mostrar resumen de categorías
      doc.setFontSize(14)
      doc.text("Resumen por Categorías", 14, yPos)
      yPos += 5
      doc.line(14, yPos, 196, yPos)
      yPos += 10

      // Tabla de categorías
      const categoryColumn = ["Categoría", "Puntaje", "Porcentaje"]
      const categoryRows = audit.categories.map((category) => [
        category.name,
        `${category.score} / ${category.maxScore}`,
        `${Math.round((category.score / category.maxScore) * 100)}%`,
      ])

      doc.autoTable({
        startY: yPos,
        head: [categoryColumn],
        body: categoryRows,
        theme: "grid",
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontStyle: "bold",
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15

      // Detalles por categoría
      doc.setFontSize(14)
      doc.text("Detalle por Categorías", 14, yPos)
      yPos += 5
      doc.line(14, yPos, 196, yPos)
      yPos += 10

      // Recorrer cada categoría
      for (const category of audit.categories) {
        // Verificar si hay espacio suficiente en la página
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(12)
        doc.text(`${category.name} (${category.score}/${category.maxScore})`, 14, yPos)
        yPos += 5

        // Tabla de items
        const itemColumn = ["Ítem", "Puntaje", "Observaciones"]
        const itemRows = category.items.map((item) => [
          item.name,
          `${item.score} / ${item.maxScore}`,
          item.observations || "",
        ])

        doc.autoTable({
          startY: yPos,
          head: [itemColumn],
          body: itemRows,
          theme: "grid",
          headStyles: {
            fillColor: [40, 40, 40],
            textColor: 255,
            fontStyle: "bold",
          },
          columnStyles: {
            2: { cellWidth: 80 }, // Ancho para observaciones
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }
    } else if (audit.items && audit.items.length > 0) {
      // Formato antiguo con items
      // Agrupar items por categoría
      const itemsByCategory: Record<string, AuditItem[]> = {}
      audit.items.forEach((item) => {
        if (!itemsByCategory[item.category]) {
          itemsByCategory[item.category] = []
        }
        itemsByCategory[item.category].push(item)
      })

      // Mostrar items por categoría
      Object.entries(itemsByCategory).forEach(([category, items]) => {
        // Verificar si hay espacio suficiente en la página
        if (yPos > 250) {
          doc.addPage()
          yPos = 20
        }

        doc.setFontSize(14)
        doc.text(`${category}`, 14, yPos)
        yPos += 5
        doc.line(14, yPos, 196, yPos)
        yPos += 10

        // Calcular puntaje de la categoría
        const categoryScore = items.reduce((sum, item) => sum + (item.completed ? item.value : 0), 0)
        const categoryMaxScore = items.reduce((sum, item) => sum + item.value, 0)

        doc.setFontSize(12)
        doc.text(`Puntaje: ${categoryScore} / ${categoryMaxScore}`, 14, yPos)
        yPos += 10

        // Tabla de items
        const tableColumn = ["Item", "Valor", "Completado"]
        const tableRows = items.map((item) => [item.name, item.value.toString(), item.completed ? "Sí" : "No"])

        doc.autoTable({
          startY: yPos,
          head: [tableColumn],
          body: tableRows,
          theme: "grid",
          headStyles: {
            fillColor: [40, 40, 40],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 15
      })
    }

    // Observaciones generales
    if (audit.generalObservations) {
      // Verificar si hay espacio suficiente en la página
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.text("Observaciones Generales", 14, yPos)
      yPos += 5
      doc.line(14, yPos, 196, yPos)
      yPos += 10

      doc.setFontSize(12)
      const splitText = doc.splitTextToSize(audit.generalObservations, 180)
      doc.text(splitText, 14, yPos)
    }

    // Guardar PDF
    const localName = audit.localName || audit.local || "Local"
    const formattedDate = formatDate(audit.date).replace(/\//g, "-")
    doc.save(`Auditoria_${localName}_${formattedDate}.pdf`)
  } catch (error) {
    console.error("Error al generar reporte de auditoría:", error)
    alert("Ocurrió un error al generar el reporte de auditoría. Por favor, intente nuevamente.")
  }
}

// Función para generar reporte de balance en PDF
export const generateBalanceReport = (balance: Balance) => {
  try {
    const doc = new jsPDF()

    // Encabezado
    doc.setFontSize(18)
    doc.text("REPORTE DE BALANCE", 105, 20, { align: "center" })

    // Información general
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]

    doc.setFontSize(12)
    doc.text(`Local: ${balance.local}`, 14, 30)
    doc.text(`Período: ${monthNames[balance.month - 1]} ${balance.year}`, 14, 35)

    // Ingresos
    doc.setFontSize(14)
    doc.text("INGRESOS", 14, 45)
    doc.line(14, 46, 196, 46)

    doc.setFontSize(12)
    doc.text(`Ventas en Mostrador: ${formatCurrency(balance.counterSales)}`, 14, 55)
    doc.text(`Ventas por Delivery: ${formatCurrency(balance.deliverySales)}`, 14, 60)
    doc.text(`TOTAL INGRESOS: ${formatCurrency(balance.totalIncome)}`, 14, 70)

    // Gastos
    doc.setFontSize(14)
    doc.text("GASTOS", 14, 80)
    doc.line(14, 81, 196, 81)

    doc.setFontSize(12)
    doc.text(`Nómina: ${formatCurrency(balance.payrollExpenses)}`, 14, 90)
    doc.text(`Alquiler: ${formatCurrency(balance.rentExpenses)}`, 14, 95)
    doc.text(`Expensas: ${formatCurrency(balance.maintenanceExpenses)}`, 14, 100)
    doc.text(`Mercadería: ${formatCurrency(balance.suppliesExpenses)}`, 14, 105)
    doc.text(`Reparaciones: ${formatCurrency(balance.repairsExpenses)}`, 14, 110)
    doc.text(`Otros: ${formatCurrency(balance.otherExpenses)}`, 14, 115)
    doc.text(`TOTAL GASTOS: ${formatCurrency(balance.totalExpenses)}`, 14, 125)

    // Resultado
    doc.setFontSize(16)
    doc.text("RESULTADO", 14, 140)
    doc.line(14, 141, 196, 141)

    doc.setFontSize(14)
    doc.text(`RENTABILIDAD NETA: ${formatCurrency(balance.netProfit)}`, 14, 150)

    // Gráfico de distribución de gastos (simulado con texto)
    doc.setFontSize(14)
    doc.text("DISTRIBUCIÓN DE GASTOS", 14, 170)
    doc.line(14, 171, 196, 171)

    // Calcular porcentajes
    const totalExpenses = balance.totalExpenses
    const payrollPercentage = ((balance.payrollExpenses / totalExpenses) * 100).toFixed(2)
    const rentPercentage = ((balance.rentExpenses / totalExpenses) * 100).toFixed(2)
    const maintenancePercentage = ((balance.maintenanceExpenses / totalExpenses) * 100).toFixed(2)
    const suppliesPercentage = ((balance.suppliesExpenses / totalExpenses) * 100).toFixed(2)
    const repairsPercentage = ((balance.repairsExpenses / totalExpenses) * 100).toFixed(2)
    const otherPercentage = ((balance.otherExpenses / totalExpenses) * 100).toFixed(2)

    doc.setFontSize(12)
    doc.text(`Nómina: ${payrollPercentage}%`, 14, 180)
    doc.text(`Alquiler: ${rentPercentage}%`, 14, 185)
    doc.text(`Expensas: ${maintenancePercentage}%`, 14, 190)
    doc.text(`Mercadería: ${suppliesPercentage}%`, 14, 195)
    doc.text(`Reparaciones: ${repairsPercentage}%`, 14, 200)
    doc.text(`Otros: ${otherPercentage}%`, 14, 205)

    // Guardar PDF
    doc.save(`Balance_${balance.local}_${monthNames[balance.month - 1]}_${balance.year}.pdf`)
  } catch (error) {
    console.error("Error al generar reporte de balance:", error)
    alert("Ocurrió un error al generar el reporte de balance. Por favor, intente nuevamente.")
  }
}

// Función para generar reporte de pedido Brozziano en PDF
export const generateOrderReport = (order: Order) => {
  try {
    const doc = new jsPDF()

    // Encabezado
    doc.setFontSize(18)
    doc.text("PEDIDO BROZZIANO", 105, 20, { align: "center" })

    // Información general
    doc.setFontSize(12)
    doc.text(`Número de Pedido: ${order.id}`, 14, 30)
    doc.text(`Fecha: ${formatDate(order.date || order.createdAt)}`, 14, 35)
    doc.text(`Local: ${order.localName || order.local}`, 14, 40)
    doc.text(`Estado: ${order.status || "Pendiente"}`, 14, 45)

    // Información del cliente
    if (order.clientName) {
      doc.text(`Cliente: ${order.clientName}`, 14, 50)
    }
    
    if (order.clientPhone) {
      doc.text(`Teléfono: ${order.clientPhone}`, 14, 55)
    }
    
    if (order.clientAddress) {
      doc.text(`Dirección: ${order.clientAddress}`, 14, 60)
    }

    let yPos = 65

    // Tabla de productos
    if (order.items && order.items.length > 0) {
      doc.setFontSize(14)
      doc.text("PRODUCTOS", 14, yPos)
      yPos += 5
      doc.line(14, yPos, 196, yPos)
      yPos += 5

      const itemsData = order.items.map((item: any) => [
        item.name || item.productName,
        item.quantity,
        formatCurrency(item.price),
        formatCurrency(item.quantity * item.price)
      ])

      doc.autoTable({
        startY: yPos,
        head: [["Producto", "Cantidad", "Precio", "Subtotal"]],
        body: itemsData,
        theme: "grid",
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontStyle: "bold",
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10

      // Total
      const total = order.total || order.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0)
      
      doc.setFontSize(14)
      doc.text(`TOTAL: ${formatCurrency(total)}`, 150, yPos, { align: "right" })
      yPos += 15
    }

    // Observaciones
    if (order.notes || order.observations) {
      const notes = order.notes || order.observations
      
      doc.setFontSize(14)
      doc.text("OBSERVACIONES", 14, yPos)
      yPos += 5
      doc.line(14, yPos, 196, yPos)
      yPos += 10

      doc.setFontSize(12)
      const splitText = doc.splitTextToSize(notes, 180)
      doc.text(splitText, 14, yPos)
    }

    // Guardar PDF
    doc.save(`Pedido_${order.id}_${formatDate(order.date || order.createdAt).replace(/\//g, "-")}.pdf`)
  } catch (error) {
    console.error("Error al generar reporte de pedido:", error)
    alert("Ocurrió un error al generar el reporte de pedido. Por favor, intente nuevamente.")
  }
}


