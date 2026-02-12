// 📁 components/routepro/StopList.tsx
'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, Clock, Edit2, Trash2, CheckCircle, Circle } from 'lucide-react';

interface Stop {
  id: string;
  stop_index: number;
  address: string;
  stop_type: 'pickup' | 'delivery' | 'return';
  notes?: string;
  time_window_start?: string;
  time_window_end?: string;
  is_completed?: boolean;
}

interface StopListProps {
  stops: Stop[];
  tier: 'free' | 'routepro_starter' | 'routepro_pro' | 'routepro_elite';
  onReorder: (stops: Stop[]) => void;
  onEdit: (stopId: string) => void;
  onDelete: (stopId: string) => void;
  onToggleComplete: (stopId: string) => void;
  canOptimize?: boolean;
}

function SortableStopItem({ 
  stop, 
  index, 
  onEdit, 
  onDelete, 
  onToggleComplete 
}: { 
  stop: Stop; 
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const typeColors = {
    pickup: 'bg-green-100 text-green-800 border-green-200',
    delivery: 'bg-blue-100 text-blue-800 border-blue-200',
    return: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const typeLabels = {
    pickup: 'PRELIEVO',
    delivery: 'CONSEGNA',
    return: 'RITORNO',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 mb-2 shadow-sm hover:shadow-md transition-all
        ${stop.is_completed ? 'opacity-60 bg-gray-50' : ''}
        ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded mt-1"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>

        {/* Stop Number */}
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-semibold text-gray-700">
          {index + 1}
        </div>

        {/* Stop Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[stop.stop_type]}`}>
              {typeLabels[stop.stop_type]}
            </span>
            {stop.is_completed && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                COMPLETATO
              </span>
            )}
          </div>
          
          <p className="text-sm font-medium text-gray-900 flex items-start gap-1">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="break-words">{stop.address}</span>
          </p>
          
          {(stop.notes || stop.time_window_start) && (
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              {stop.notes && (
                <p className="flex items-start gap-1">
                  <span className="font-medium">📝</span>
                  <span className="italic">{stop.notes}</span>
                </p>
              )}
              {(stop.time_window_start || stop.time_window_end) && (
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {stop.time_window_start || '--:--'} - {stop.time_window_end || '--:--'}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleComplete(stop.id)}
            className={`p-2 rounded-lg transition-colors
              ${stop.is_completed 
                ? 'text-green-600 hover:bg-green-50' 
                : 'text-gray-400 hover:bg-gray-100'}`}
            title={stop.is_completed ? 'Segna come non completato' : 'Segna come completato'}
          >
            {stop.is_completed ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onEdit(stop.id)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(stop.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StopList({
  stops,
  tier,
  onReorder,
  onEdit,
  onDelete,
  onToggleComplete,
  canOptimize = false,
}: StopListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex((s) => s.id === active.id);
      const newIndex = stops.findIndex((s) => s.id === over.id);
      
      const reordered = arrayMove(stops, oldIndex, newIndex);
      // Aggiorna stop_index
      const updated = reordered.map((stop, idx) => ({
        ...stop,
        stop_index: idx,
      }));
      
      onReorder(updated);
    }
  };

  // Limiti tier
  const maxStops = {
    free: 10,
    routepro_starter: 60,
    routepro_pro: 150,
    routepro_elite: 300,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Fermate ({stops.length}/{maxStops[tier] || 60})
          </h3>
          <p className="text-sm text-gray-500">
            {tier === 'routepro_starter' && '❌ Ottimizzazione non disponibile'}
            {tier === 'routepro_pro' && '✅ Ottimizzazione percorso attiva'}
            {tier === 'routepro_elite' && '⭐ Ottimizzazione prioritaria'}
          </p>
        </div>
        
        {canOptimize && tier !== 'routepro_starter' && stops.length >= 2 && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Ottimizza percorso
          </button>
        )}
      </div>

      {/* Stop List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stops.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <SortableStopItem
                key={stop.id}
                stop={stop}
                index={index}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {stops.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nessuna fermata</p>
          <p className="text-sm text-gray-500 mt-1">
            Aggiungi indirizzi per creare il percorso
          </p>
        </div>
      )}
    </div>
  );
}