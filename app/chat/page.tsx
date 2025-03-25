"use client"

import { useState, useRef, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { Send, Search, PlusCircle, Users, User } from 'lucide-react'

// Datos de ejemplo para usuarios
const usuarios = [
  {
    id: "1",
    nombre: "Juan Pérez",
    rol: "admin",
    avatar: "",
    online: true,
    ultimaConexion: "Ahora",
  },
  {
    id: "2",
    nombre: "María López",
    rol: "manager",
    avatar: "",
    online: true,
    ultimaConexion: "Hace 5 min",
  },
  {
    id: "3",
    nombre: "Carlos Rodríguez",
    rol: "supervisor",
    avatar: "",
    online: false,
    ultimaConexion: "Hace 1 hora",
  },
  {
    id: "4",
    nombre: "Ana Martínez",
    rol: "cashier",
    avatar: "",
    online: false,
    ultimaConexion: "Hace 3 horas",
  },
  {
    id: "5",
    nombre: "Roberto Sánchez",
    rol: "employee",
    avatar: "",
    online: true,
    ultimaConexion: "Ahora",
  },
]

// Datos de ejemplo para chats
const chatsIniciales = [
  {
    id: "1",
    usuario: "1",
    mensajes: [
      {
        id: "1",
        emisor: "1",
        texto: "Hola, ¿cómo estás?",
        fecha: "10:30",
        leido: true,
      },
      {
        id: "2",
        emisor: "current",
        texto: "Bien, gracias. ¿Y tú?",
        fecha: "10:31",
        leido: true,
      },
      {
        id: "3",
        emisor: "1",
        texto: "Todo bien. ¿Necesitas algo?",
        fecha: "10:32",
        leido: true,
      },
    ],
  },
  {
    id: "2",
    usuario: "2",
    mensajes: [
      {
        id: "1",
        emisor: "2",
        texto: "Hola, necesito información sobre el reporte de ventas",
        fecha: "09:15",
        leido: true,
      },
      {
        id: "2",
        emisor: "current",
        texto: "Claro, te lo envío en un momento",
        fecha: "09:20",
        leido: true,
      },
    ],
  },
  {
    id: "3",
    usuario: "3",
    mensajes: [
      {
        id: "1",
        emisor: "3",
        texto: "¿Podemos reunirnos mañana?",
        fecha: "Ayer",
        leido: false,
      },
    ],
  },
]

// Componente para el chat
export default function ChatPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("chats")
  const [searchTerm, setSearchTerm] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [chatActivo, setChatActivo] = useState<string | null>(null)
  const [chats, setChats] = useState(chatsIniciales)
  const mensajesFinRef = useRef<HTMLDivElement>(null)

  // Filtrar usuarios según término de búsqueda
  const filteredUsuarios = usuarios.filter((usuario) =>
    usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase())