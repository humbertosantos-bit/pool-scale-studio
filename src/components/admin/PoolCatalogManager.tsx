import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Pencil, X, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface PoolModel {
  id: string;
  name: string;
  display_name: string;
  width_feet: number;
  width_inches: number;
  length_feet: number;
  length_inches: number;
  image_url: string | null;
  created_at: string;
}

export const PoolCatalogManager: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [models, setModels] = useState<PoolModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New pool form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formWidthFeet, setFormWidthFeet] = useState('12');
  const [formWidthInches, setFormWidthInches] = useState('0');
  const [formLengthFeet, setFormLengthFeet] = useState('24');
  const [formLengthInches, setFormLengthInches] = useState('0');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit form
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editWidthFeet, setEditWidthFeet] = useState('');
  const [editWidthInches, setEditWidthInches] = useState('');
  const [editLengthFeet, setEditLengthFeet] = useState('');
  const [editLengthInches, setEditLengthInches] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('pool_models')
        .select('*')
        .order('display_name');
      if (error) throw error;
      setModels((data as unknown as PoolModel[]) || []);
    } catch (error: any) {
      toast({ title: 'Error loading pool models', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('pool-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('pool-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageSelect = (file: File | null) => {
    setFormImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFormImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFormImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDisplayName.trim()) {
      toast({ title: 'Name and display name are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (formImage) {
        imageUrl = await uploadImage(formImage);
      }
      const { error } = await supabase.from('pool_models').insert({
        name: formName.trim().toLowerCase().replace(/\s+/g, '-'),
        display_name: formDisplayName.trim(),
        width_feet: parseInt(formWidthFeet) || 0,
        width_inches: parseFloat(formWidthInches) || 0,
        length_feet: parseInt(formLengthFeet) || 0,
        length_inches: parseFloat(formLengthInches) || 0,
        image_url: imageUrl,
      } as any);
      if (error) throw error;
      toast({ title: 'Pool model added!' });
      resetForm();
      fetchModels();
    } catch (error: any) {
      toast({ title: 'Error adding pool model', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDisplayName('');
    setFormWidthFeet('12');
    setFormWidthInches('0');
    setFormLengthFeet('24');
    setFormLengthInches('0');
    setFormImage(null);
    setFormImagePreview(null);
    setShowForm(false);
  };

  const startEditing = (model: PoolModel) => {
    setEditingId(model.id);
    setEditDisplayName(model.display_name);
    setEditWidthFeet(String(model.width_feet));
    setEditWidthInches(String(model.width_inches));
    setEditLengthFeet(String(model.length_feet));
    setEditLengthInches(String(model.length_inches));
    setEditImage(null);
  };

  const handleUpdate = async (id: string) => {
    try {
      let updateData: any = {
        display_name: editDisplayName.trim(),
        width_feet: parseInt(editWidthFeet) || 0,
        width_inches: parseFloat(editWidthInches) || 0,
        length_feet: parseInt(editLengthFeet) || 0,
        length_inches: parseFloat(editLengthInches) || 0,
        updated_at: new Date().toISOString(),
      };
      if (editImage) {
        updateData.image_url = await uploadImage(editImage);
      }
      const { error } = await supabase.from('pool_models').update(updateData).eq('id', id);
      if (error) throw error;
      toast({ title: 'Pool model updated!' });
      setEditingId(null);
      fetchModels();
    } catch (error: any) {
      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('pool_models').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Pool model deleted' });
      fetchModels();
    } catch (error: any) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Pool Catalog</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Pool Model
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-muted/30 rounded-lg border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Internal Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="azoria-12x24" className="h-8 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Display Name</Label>
              <Input value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)} placeholder="Azoria 12x24" className="h-8 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Width (ft)</Label>
              <Input type="number" value={formWidthFeet} onChange={(e) => setFormWidthFeet(e.target.value)} className="h-8 text-sm" min="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Width (in)</Label>
              <Input type="number" value={formWidthInches} onChange={(e) => setFormWidthInches(e.target.value)} className="h-8 text-sm" min="0" max="11" step="0.5" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Length (ft)</Label>
              <Input type="number" value={formLengthFeet} onChange={(e) => setFormLengthFeet(e.target.value)} className="h-8 text-sm" min="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Length (in)</Label>
              <Input type="number" value={formLengthInches} onChange={(e) => setFormLengthInches(e.target.value)} className="h-8 text-sm" min="0" max="11" step="0.5" />
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-1">
            <Label className="text-xs">Pool Image (top-down view)</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />
                {formImage ? 'Change Image' : 'Upload Image'}
              </Button>
              {formImagePreview && (
                <div className="relative">
                  <img src={formImagePreview} alt="Preview" className="h-16 w-auto rounded border object-contain" />
                  <button type="button" onClick={() => handleImageSelect(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]">✕</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Pool'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Models List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>
                  {model.image_url ? (
                    <img src={model.image_url} alt={model.display_name} className="h-10 w-14 object-contain rounded border" />
                  ) : (
                    <div className="h-10 w-14 rounded border flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #38BDF8, #7DD3FC)' }}>
                      <span className="text-[8px] text-white font-bold">POOL</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === model.id ? (
                    <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="h-7 text-xs" />
                  ) : (
                    <span className="font-medium text-sm">{model.display_name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === model.id ? (
                    <div className="flex gap-1 items-center">
                      <Input type="number" value={editWidthFeet} onChange={(e) => setEditWidthFeet(e.target.value)} className="w-10 h-7 text-xs p-1" />
                      <span className="text-[10px]">'</span>
                      <Input type="number" value={editWidthInches} onChange={(e) => setEditWidthInches(e.target.value)} className="w-10 h-7 text-xs p-1" />
                      <span className="text-[10px]">" ×</span>
                      <Input type="number" value={editLengthFeet} onChange={(e) => setEditLengthFeet(e.target.value)} className="w-10 h-7 text-xs p-1" />
                      <span className="text-[10px]">'</span>
                      <Input type="number" value={editLengthInches} onChange={(e) => setEditLengthInches(e.target.value)} className="w-10 h-7 text-xs p-1" />
                      <span className="text-[10px]">"</span>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                      />
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => editFileInputRef.current?.click()} title="Change image">
                        <Upload className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {model.width_feet}'{model.width_inches > 0 ? `${model.width_inches}"` : ''} × {model.length_feet}'{model.length_inches > 0 ? `${model.length_inches}"` : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === model.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(model.id)}>
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(model)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {model.display_name}?</AlertDialogTitle>
                            <AlertDialogDescription>This pool model will be removed from the catalog.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(model.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {models.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No pool models yet. Add your first pool model above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
