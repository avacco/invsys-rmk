import { Pencil, Trash2 } from 'lucide-react'
import { Button } from './ui'

export function RowActions({ label, onEdit, onDelete }: { label: string; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      {onEdit && <Button variant="ghost" className="px-2" aria-label={`Editar ${label}`} onClick={onEdit} icon={<Pencil className="h-4 w-4" />} />}
      {onDelete && <Button variant="ghost" className="px-2 hover:text-red-600" aria-label={`Eliminar ${label}`} onClick={onDelete} icon={<Trash2 className="h-4 w-4" />} />}
    </div>
  )
}
