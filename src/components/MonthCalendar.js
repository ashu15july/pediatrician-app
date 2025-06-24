import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MonthCalendar = ({ selectedDate, setSelectedDate, appointments }) => {
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1
  ).getDay();

  const weeks = [];
  let days = [];
  let day = 1;

  // Previous month days
  for (let i = 0; i < firstDayOfMonth; i++) {
    const prevMonthDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      -firstDayOfMonth + i + 1
    );
    days.push({
      date: prevMonthDay,
      isCurrentMonth: false,
      hasAppointments: false
    });
  }

  // Current month days
  while (day <= daysInMonth) {
    const currentDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      day
    );
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasAppointments = appointments.some(apt => apt.date === dateStr);

    days.push({
      date: currentDate,
      isCurrentMonth: true,
      hasAppointments
    });

    if (days.length === 7) {
      weeks.push(days);
      days = [];
    }
    day++;
  }

  // Next month days
  if (days.length > 0) {
    const remainingDays = 7 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        i
      );
      days.push({
        date: nextMonthDay,
        isCurrentMonth: false,
        hasAppointments: false
      });
    }
    weeks.push(days);
  }

  const handlePrevMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {selectedDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric'
          })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => (
                <button
                  key={dayIndex}
                  onClick={() => setSelectedDate(day.date)}
                  className={`
                    relative h-14 p-1 text-sm rounded-lg transition-colors
                    ${day.isCurrentMonth ? 'hover:bg-gray-100' : 'text-gray-400'}
                    ${isToday(day.date) ? 'bg-blue-50' : ''}
                    ${
                      selectedDate.toDateString() === day.date.toDateString()
                        ? 'bg-blue-100'
                        : ''
                    }
                  `}
                >
                  <span className="block text-right mb-1">{day.date.getDate()}</span>
                  {day.hasAppointments && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonthCalendar; 