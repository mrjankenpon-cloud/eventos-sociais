import { useCallback, useEffect, useState } from 'react';
import { Event } from '../types';
import { eventService } from '../services/event.service';

/** Hook bound to Firestore via eventService. */
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getAll();
      setEvents(data);
    } catch (error) {
      console.error('[useEvents]', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEvent = async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    try {
      await eventService.create(event);
      await refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const updateEvent = async (id: string, updatedData: Partial<Event>) => {
    setIsLoading(true);
    try {
      await eventService.update(id, updatedData);
      await refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    setIsLoading(true);
    try {
      await eventService.delete(id);
      await refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh,
  };
}
