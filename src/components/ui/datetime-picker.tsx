import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DateTimePicker({ date, setDate, placeholder = "Sélectionner une date" }: DateTimePickerProps) {
  const [time, setTime] = React.useState(date ? format(date, "HH:mm") : "09:00");

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = time.split(":");
      selectedDate.setHours(parseInt(hours), parseInt(minutes));
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    
    if (date) {
      const [hours, minutes] = newTime.split(":");
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      setDate(newDate);
    }
  };

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: fr }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            locale={fr}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      
      <Input
        type="time"
        value={time}
        onChange={handleTimeChange}
        className="w-32"
      />
    </div>
  );
}
