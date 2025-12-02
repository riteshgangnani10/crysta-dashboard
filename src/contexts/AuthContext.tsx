'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthUser, SimpleAuth } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const currentUser = SimpleAuth.getCurrentUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    try {
      const user = SimpleAuth.signIn(email, password)
      if (user) {
        setUser(user)
        return true
      }
      return false
    } catch (error) {
      console.error('Sign in error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const signOut = () => {
    SimpleAuth.signOut()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: user !== null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
