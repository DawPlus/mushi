import { createContext, useContext } from 'react'

type OwnerAuthValue = {
  signOut: () => void
}

const OwnerAuthContext = createContext<OwnerAuthValue | null>(null)

export function OwnerAuthProvider({
  value,
  children,
}: {
  value: OwnerAuthValue
  children: React.ReactNode
}) {
  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>
}

export function useOwnerAuth() {
  return useContext(OwnerAuthContext)
}
