// app/agenda/page.tsx - VERSIONE UNIFORMATA NDW
"use client";

import Link from "next/link"; // IMPORT AGGIUNTO
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, Clock, Briefcase, Users, Coffee, Home, Trash2, ArrowLeft, LayoutDashboard } from "lucide-react";

type EventType = {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'work' | 'appointment' | 'break' | 'personal';
  color: string;
};

export default function AgendaPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    event_type: "work" as EventType['event_type'],
  });

  // Carica eventi all'avvio
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ndw_events')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(50);

      if (error) {
        console.error("Errore caricamento eventi:", error);
      } else if (data) {
        setEvents(data);
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addEvent() {
    // Validazione base
    if (!newEvent.title.trim()) {
      alert("Inserisci un titolo per l'evento");
      return;
    }
    if (!newEvent.start_time || !newEvent.end_time) {
      alert("Inserisci data e ora di inizio e fine");
      return;
    }

    // Converti le stringhe in Date per validazione
    const startDate = new Date(newEvent.start_time);
    const endDate = new Date(newEvent.end_time);
    
    if (endDate <= startDate) {
      alert("L'ora di fine deve essere successiva all'ora di inizio");
      return;
    }

    try {
      const { error } = await supabase
        .from('ndw_events')
        .insert([{
          ...newEvent,
          color: getEventColor(newEvent.event_type),
        }]);

      if (error) {
        console.error("Errore inserimento:", error);
        alert("Errore nel salvataggio: " + error.message);
        return;
      }

      // Reset form
      setNewEvent({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        event_type: "work",
      });

      // Ricarica eventi
      loadEvents();
      alert("Evento aggiunto con successo!");
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore imprevisto");
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo evento?")) return;

    const { error } = await supabase
      .from('ndw_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Errore eliminazione:", error);
      alert("Errore nell'eliminazione");
    } else {
      loadEvents();
    }
  }

  // Funzioni helper
  function formatDateTime(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('it-IT', { 
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  function formatTimeOnly(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  function getEventIcon(type: EventType['event_type']) {
    switch(type) {
      case 'work': return <Briefcase className="h-4 w-4" />;
      case 'appointment': return <Users className="h-4 w-4" />;
      case 'break': return <Coffee className="h-4 w-4" />;
      case 'personal': return <Home className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  }

  function getEventColor(type: EventType['event_type']): string {
    switch(type) {
      case 'work': return '#1F6FEB'; // NDW Blue
      case 'appointment': return '#8B5CF6'; // Viola
      case 'break': return '#10B981'; // Verde
      case 'personal': return '#F59E0B'; // Arancione
      default: return '#6B7280'; // Grigio
    }
  }

  function getEventTypeLabel(type: EventType['event_type']): string {
    switch(type) {
      case 'work': return 'Lavoro';
      case 'appointment': return 'Appuntamento';
      case 'break': return 'Pausa';
      case 'personal': return 'Personale';
      default: return type;
    }
  }

  // Imposta data/ora predefinite per il form
  function setDefaultTimes() {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // Tra 1 ora
    const end = new Date(start.getTime() + 60 * 60 * 1000); // Durata 1 ora
    
    // Formatta per input datetime-local (YYYY-MM-DDThh:mm)
    const formatForInput = (date: Date) => {
      return date.toISOString().slice(0, 16);
    };

    setNewEvent(prev => ({
      ...prev,
      start_time: formatForInput(start),
      end_time: formatForInput(end)
    }));
  }

  // Imposta orari predefiniti al primo render
  useEffect(() => {
    if (!newEvent.start_time && !newEvent.end_time) {
      setDefaultTimes();
    }
  }, []);

  return (
    <main className="min-h-dvh bg-white text-neutral-900">
      {/* ===== HEADER NDW STANDARD ===== */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo + Nome NDW */}
          <Link href="/hub" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
              <div className="h-5 w-5 rounded-md bg-primary/80" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-neutral-800">NDW Agenda</span>
              <span className="text-[11px] text-neutral-500">Nota Digital Works</span>
            </div>
          </Link>

          {/* Navigazione */}
          <div className="flex items-center gap-3">
            {/* Contatore Eventi */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100">
              <Calendar className="h-3.5 w-3.5 text-neutral-600" />
              <span className="text-xs font-medium text-neutral-700">
                {loading ? "..." : `${events.length} eventi`}
              </span>
            </div>

            {/* Pulsante Torna a Hub */}
            <Link href="/hub">
              <Button variant="outline" size="sm" className="gap-2 border-neutral-300 hover:border-primary hover:bg-primary/5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Torna a Hub</span>
                <span className="sm:hidden">Hub</span>
              </Button>
            </Link>

            {/* Pulsante Home */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-primary">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== CONTENUTO PRINCIPALE ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Calendar className="h-3 w-3" />
            NDW Core • Funzione Universale
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            La tua Agenda NDW
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Pianifica turni, appuntamenti, pause. Sincronizzato su tutti i tuoi dispositivi NDW.
            <span className="block mt-2 text-xs text-primary font-medium bg-primary/5 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              ⚡ Funzione inclusa in tutti i piani NDW
            </span>
          </p>
        </div>

        {/* Grid Principale */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Colonna sinistra: Form nuovo evento */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-2xl border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  Nuovo Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Titolo *</label>
                  <Input
                    placeholder="Es: Consegna Milano, Meeting, Pausa pranzo"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Descrizione (opzionale)</label>
                  <Input
                    placeholder="Note, indirizzo, dettagli..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Inizio *</label>
                    <Input
                      type="datetime-local"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                      className="border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Fine *</label>
                    <Input
                      type="datetime-local"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                      className="border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Tipo evento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['work', 'appointment', 'break', 'personal'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`p-3 rounded-xl border text-sm flex flex-col items-center justify-center gap-1.5 transition-all ${
                          newEvent.event_type === type
                            ? 'border-primary bg-primary/5 text-primary font-medium shadow-sm'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                        onClick={() => setNewEvent({...newEvent, event_type: type})}
                      >
                        <div className={`p-1.5 rounded-lg ${newEvent.event_type === type ? 'bg-primary/10' : 'bg-neutral-100'}`}>
                          {getEventIcon(type)}
                        </div>
                        <span>{getEventTypeLabel(type)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button onClick={addEvent} className="w-full bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi all'Agenda
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={setDefaultTimes}
                    className="w-full border-neutral-300 hover:border-primary hover:bg-primary/5"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Imposta orari suggeriti
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mini dashboard */}
            <Card className="rounded-2xl border border-neutral-200/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Statistiche</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                    <span className="text-sm text-neutral-600">Eventi totali</span>
                    <span className="font-semibold text-lg">{events.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                    <span className="text-sm text-neutral-600">Eventi lavoro</span>
                    <span className="font-semibold text-primary">
                      {events.filter(e => e.event_type === 'work').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Prossimo evento</span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {events.length > 0 
                        ? formatTimeOnly(events[0].start_time)
                        : 'Nessuno'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna destra: Lista eventi */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl h-full border border-neutral-200/80 shadow-sm">
              <CardHeader className="border-b border-neutral-100">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    I tuoi Eventi
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadEvents}
                    className="text-xs text-neutral-600 hover:text-primary"
                  >
                    Aggiorna
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-16">
                    <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-neutral-700">Caricamento agenda...</p>
                    <p className="text-xs text-neutral-500 mt-1">Sto recuperando i tuoi eventi</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-10 w-10 text-primary/60" />
                    </div>
                    <h3 className="font-semibold text-neutral-800">Agenda vuota</h3>
                    <p className="text-sm text-neutral-600 mt-1 max-w-md mx-auto">
                      Non hai ancora eventi pianificati. Aggiungi il tuo primo evento usando il form a sinistra.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-6 border-primary/30 hover:border-primary hover:bg-primary/5"
                      onClick={setDefaultTimes}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crea il tuo primo evento
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-5 hover:bg-neutral-50/80 transition-colors group"
                      >
                        <div className="flex gap-4">
                          {/* Colore e icona */}
                          <div 
                            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: event.color + '15' }}
                          >
                            <div 
                              className="p-2 rounded-xl"
                              style={{ backgroundColor: event.color + '30' }}
                            >
                              <div style={{ color: event.color }}>
                                {getEventIcon(event.event_type)}
                              </div>
                            </div>
                          </div>

                          {/* Contenuto evento */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-neutral-900">{event.title}</h3>
                                {event.description && (
                                  <p className="text-sm text-neutral-600 mt-1.5">{event.description}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEvent(event.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 hover:bg-red-50"
                                title="Elimina evento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex flex-wrap gap-3 mt-4">
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100">
                                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                                <span className="text-xs font-medium text-neutral-700">
                                  {formatTimeOnly(event.start_time)} - {formatTimeOnly(event.end_time)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100">
                                <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                <span className="text-xs text-neutral-600">
                                  {formatDateTime(event.start_time)}
                                </span>
                              </div>
                              
                              <div 
                                className="text-xs px-3 py-1.5 rounded-full font-medium shadow-sm"
                                style={{ 
                                  backgroundColor: event.color + '20',
                                  color: event.color
                                }}
                              >
                                {getEventTypeLabel(event.event_type)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== FOOTER NDW STANDARD ===== */}
      <footer className="border-t border-neutral-200 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded bg-primary/70" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-700">NDW Agenda</div>
                <div className="text-[11px] text-neutral-500">Parte di NDW Core • {new Date().getFullYear()}</div>
              </div>
            </div>
            
            <div className="text-xs text-neutral-500 flex items-center gap-4">
              <span className="hidden sm:inline">Nota Digital Works</span>
              <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
              <span>{events.length} eventi attivi</span>
              <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
              <span className="text-primary font-medium">v1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}