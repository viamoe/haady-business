'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface LeaveConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaving: boolean
  onDiscard: () => void
  onKeepEditing: () => void
  onSaveAndLeave: () => void
}

/**
 * Leave Confirmation Dialog
 * Shown when the user tries to leave the product edit page with unsaved changes
 * Offers three options: Discard, Keep Editing, or Save & Leave
 */
export const LeaveConfirmationDialog = memo(function LeaveConfirmationDialog({
  open,
  onOpenChange,
  isSaving,
  onDiscard,
  onKeepEditing,
  onSaveAndLeave,
}: LeaveConfirmationDialogProps) {
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(isOpen) => !isSaving && onOpenChange(isOpen)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save your progress?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Would you like to save them as a draft before leaving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="!flex-row !gap-3 !justify-end">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            Discard
          </Button>
          
          <AlertDialogCancel 
            onClick={onKeepEditing}
            disabled={isSaving}
            className="flex-1"
          >
            Keep editing
          </AlertDialogCancel>
          
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              onSaveAndLeave()
            }} 
            disabled={isSaving}
            className="flex-1 bg-[#F4610B] hover:bg-[#E5550A]"
          >
            {isSaving ? 'Saving...' : 'Save & Leave'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})

