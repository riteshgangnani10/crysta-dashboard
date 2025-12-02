import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: 'admin' | 'viewer'
}

export class AuthService {
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  static async signUp(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
          role: 'viewer',
        },
      },
    })

    if (error) throw error
    return data
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.email,
      role: user.user_metadata?.role || 'viewer',
    }
  }

  static async updateProfile(updates: Partial<AuthUser>) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    })

    if (error) throw error
    return data
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email,
          role: session.user.user_metadata?.role || 'viewer',
        }
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

// Simple client-side auth for demo purposes
export class SimpleAuth {
  private static readonly STORAGE_KEY = 'crysta_dashboard_auth'
  private static readonly DEMO_CREDENTIALS = {
    email: 'admin@crysta.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin' as const,
  }

  static signIn(email: string, password: string): AuthUser | null {
    if (email === this.DEMO_CREDENTIALS.email && password === this.DEMO_CREDENTIALS.password) {
      const user: AuthUser = {
        id: '1',
        email: this.DEMO_CREDENTIALS.email,
        name: this.DEMO_CREDENTIALS.name,
        role: this.DEMO_CREDENTIALS.role,
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      }
      
      return user
    }
    return null
  }

  static signOut(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }
}
