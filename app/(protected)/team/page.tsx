"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Plus, KeyRound, Trash2, Shield, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

const ROLE_BADGE: Record<string, string> = {
  manager: "bg-purple-100 text-purple-800",
  worker: "bg-blue-100 text-blue-800",
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Add member dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addName, setAddName] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addPassword, setAddPassword] = useState("")
  const [addRole, setAddRole] = useState("worker")
  const [adding, setAdding] = useState(false)

  // Reset password dialog
  const [resetMember, setResetMember] = useState<TeamMember | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetting, setResetting] = useState(false)

  // Delete confirmation
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTeam()
  }, [])

  const fetchTeam = async () => {
    try {
      const response = await fetch("/api/team")
      const data = await response.json()
      if (data.users) {
        setMembers(data.users)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      })
      return
    }

    setAdding(true)
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team member")
      }

      toast({
        title: "Success",
        description: `${addName} has been added to the team`,
      })

      setShowAddDialog(false)
      setAddName("")
      setAddEmail("")
      setAddPassword("")
      setAddRole("worker")
      fetchTeam()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetMember || !newPassword.trim()) return

    setResetting(true)
    try {
      const response = await fetch(`/api/team/${resetMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      toast({
        title: "Success",
        description: `Password reset for ${resetMember.name || resetMember.email}`,
      })

      setResetMember(null)
      setNewPassword("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteMember) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/team/${deleteMember.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete team member")
      }

      toast({
        title: "Success",
        description: `${deleteMember.name || deleteMember.email} has been removed`,
      })

      setDeleteMember(null)
      fetchTeam()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleRoleChange = async (member: TeamMember, newRole: string) => {
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role")
      }

      toast({
        title: "Success",
        description: `${member.name || member.email} is now a ${newRole}`,
      })

      fetchTeam()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Manage your production team members
          </p>
        </div>
        <Button className="w-full sm:w-auto self-start sm:self-auto" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-2xl">
            Team Members ({members.length})
          </CardTitle>
          <CardDescription>
            All users with access to the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No team members found
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">Role</th>
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">Joined</th>
                        <th className="text-center text-xs font-medium text-muted-foreground p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="p-3 font-medium text-sm">{member.name || "—"}</td>
                          <td className="p-3 text-sm text-muted-foreground">{member.email}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[member.role] || "bg-gray-100 text-gray-800"}`}>
                              {member.role === "manager" ? (
                                <Shield className="mr-1 h-3 w-3" />
                              ) : (
                                <User className="mr-1 h-3 w-3" />
                              )}
                              {member.role}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setResetMember(member)}
                                title="Reset Password"
                              >
                                <KeyRound className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setDeleteMember(member)}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col gap-3">
                {members.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{member.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[member.role] || "bg-gray-100 text-gray-800"}`}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => {
                          const newRole = member.role === "manager" ? "worker" : "manager"
                          handleRoleChange(member, newRole)
                        }}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {member.role === "manager" ? "Demote" : "Promote"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => setResetMember(member)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Password
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 ml-auto text-destructive hover:text-destructive"
                        onClick={() => setDeleteMember(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:mx-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new account for a production team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="John Smith"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="john@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Set a password"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-role">Role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Creating..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetMember !== null} onOpenChange={() => { setResetMember(null); setNewPassword("") }}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:mx-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetMember?.name || resetMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetMember(null); setNewPassword("") }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting || !newPassword.trim()}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteMember !== null} onOpenChange={() => setDeleteMember(null)}>
        <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:mx-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteMember?.name || deleteMember?.email}&apos;s account
              and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

