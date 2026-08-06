import { useState } from 'react';
import { Event } from '../types';
import { MOCK_EVENTS } from '../mock/events';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [isLoading, setIsLoading] = useState(false);

  const addEvent = (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setTimeout(() => {
      const newEvent: Event = {
        ...event,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEvents((prev) => [newEvent, ...prev]);
      setIsLoading(false);
    }, 800);
  };

  const updateEvent = (id: string, updatedData: Partial<Event>) => {
    setIsLoading(true);
    setTimeout(() => {
      setEvents((prev) => 
        prev.map((event) => (event.id === id ? { ...event, ...updatedData } : event))
      );
      setIsLoading(false);
    }, 800);
  };

  const deleteEvent = (id: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setIsLoading(false);
    }, 800);
  };

  return {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}
