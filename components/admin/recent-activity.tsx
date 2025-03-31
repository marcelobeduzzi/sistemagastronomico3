"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Datos de ejemplo
const activities = [
  {
    id: 1,
    user: {
      name: "Juan Pérez",
      email: "juan@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "JP",
    },
    action: "creó un nuevo usuario",
    timestamp: "hace 5 minutos",
  },
  {
    id: 2,
    user: {
      name: "María López",
      email: "maria@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "ML",
    },
    action: "generó un reporte de ventas",
    timestamp: "hace 15 minutos",
  },
  {
    id: 3,
    user: {
      name: "Carlos Gómez",
      email: "carlos@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "CG",
    },
    action: "configuró una nueva alerta",
    timestamp: "hace 1 hora",
  },
  {
    id: 4,
    user: {
      name: "Ana Martínez",
      email: "ana@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "AM",
    },
    action: "actualizó la configuración del sistema",
    timestamp: "hace 3 horas",
  },
  {
    id: 5,
    user: {
      name: "Roberto Sánchez",
      email: "roberto@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      initials: "RS",
    },
    action: "generó 5 nuevos códigos QR",
    timestamp: "hace 5 horas",
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>
          Últimas acciones realizadas en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback>{activity.user.initials}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.user.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.action}
                </p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {activity.timestamp}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}