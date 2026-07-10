'use client';

import React from 'react';
import { useFlightStore } from '@/store/flightStore';
import { 
  BarChart, 
  TrendingUp, 
  PieChart, 
  Users, 
  Plane, 
  Globe, 
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

export default function Analytics() {
  const { tickets, users } = useFlightStore();

  // 1. Calculations for KPI cards
  const totalTickets = tickets.length;
  
  // Date comparisons based on system date: 2026-06-28
  const sysDateStr = '2026-06-28';
  const todayStart = new Date(`${sysDateStr}T00:00:00Z`);
  const todayEnd = new Date(`${sysDateStr}T23:59:59Z`);

  const todayFlights = tickets.filter(t => {
    const dep = new Date(t.departure_time_utc);
    return dep >= todayStart && dep <= todayEnd;
  }).length;

  const upcomingFlights = tickets.filter(t => {
    const dep = new Date(t.departure_time_utc);
    return dep > todayEnd && t.status !== 'Archived' && t.status !== 'Missed';
  }).length;

  const activeStaff = users.length;

  // 2. Data for Monthly Tickets (Bar Chart)
  // Let's count departures by month (Jan-Dec 2026)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCounts = Array(12).fill(0);
  tickets.forEach(t => {
    const dep = new Date(t.departure_time_utc);
    if (dep.getFullYear() === 2026) {
      monthlyCounts[dep.getMonth()]++;
    }
  });
  
  // Max count for scaling the monthly bar chart (default to 5 if no data)
  const maxMonthlyCount = Math.max(...monthlyCounts, 5);

  // 3. Data for Airline Distribution (Donut Chart)
  const airlineCounts: Record<string, number> = {};
  tickets.forEach(t => {
    airlineCounts[t.airline] = (airlineCounts[t.airline] || 0) + 1;
  });

  const airlineData = Object.entries(airlineCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / totalTickets) * 100) || 0
  }));

  // Standard colors for airline donut segments
  const segmentColors = [
    '#1e40af', // Primary
    '#06b6d4', // Accent
    '#10b981', // Success
    '#f59e0b', // Warning
    '#ef4444', // Error
    '#8b5cf6'  // Purple
  ];

  // 4. Data for Departure Trends (Area/Line Chart)
  // Let's plot departure count over a 7-day window (June 24 to June 30, 2026)
  const trendDays = ['Wed 24', 'Thu 25', 'Fri 26', 'Sat 27', 'Sun 28', 'Mon 29', 'Tue 30'];
  const trendCounts = [1, 2, 0, 1, 3, 2, 1]; // Mock points indicating departures activity
  // Make sure it incorporates some real ticket dates if any fall in this window
  tickets.forEach(t => {
    const dateStr = t.departure_time_utc.substring(0, 10); // YYYY-MM-DD
    if (dateStr === '2026-06-25') trendCounts[1]++;
    if (dateStr === '2026-06-27') trendCounts[3]++;
    if (dateStr === '2026-06-28') trendCounts[4]++;
    if (dateStr === '2026-06-29') trendCounts[5]++;
  });

  const maxTrendCount = Math.max(...trendCounts, 4);

  // SVG Area points generator helper
  const generateSvgAreaPoints = (data: number[], width: number, height: number) => {
    const step = width / (data.length - 1);
    let points = '';
    data.forEach((val, index) => {
      const x = index * step;
      const y = height - (val / maxTrendCount) * (height - 20); // 20px padding
      points += `${x},${y} `;
    });
    return points;
  };

  const trendPoints = generateSvgAreaPoints(trendCounts, 500, 150);
  const trendClosedPoints = `0,150 ${trendPoints} 500,150`;

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6 animate-in fade-in duration-200">
      
      {/* Analytics Top */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-semibold">Analytics Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Performance counters and departure distributions across Season Travels regions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('Mock Feature: Exporting PDF Report...')}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            Export CSV/PDF
          </button>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Tickets */}
        <div className="glass rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tickets</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono leading-none mt-1">
              {totalTickets}
            </span>
            <span className="text-[9px] text-success font-semibold mt-1">▲ 12% vs last month</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Today's Flights */}
        <div className="glass rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Departures</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono leading-none mt-1">
              {todayFlights}
            </span>
            <span className="text-[9px] text-slate-400 mt-1">Scheduled for Jun 28</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Upcoming Flights */}
        <div className="glass rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Flights</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono leading-none mt-1">
              {upcomingFlights}
            </span>
            <span className="text-[9px] text-slate-400 mt-1">Next week schedule</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Active Staff */}
        <div className="glass rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Staff</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono leading-none mt-1">
              {activeStaff}
            </span>
            <span className="text-[9px] text-slate-450 mt-1">Sri Lanka & Sweden</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Monthly Tickets (Bar Chart) */}
        <div className="glass rounded-3xl p-5 md:p-6 lg:col-span-2 shadow-sm border border-[var(--card-border)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <BarChart className="w-4 h-4 text-primary dark:text-accent" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Departure Bookings (2026)</h3>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-44 w-full flex items-end justify-between gap-1 pt-6 px-2">
            {months.map((month, idx) => {
              const val = monthlyCounts[idx];
              const pct = (val / maxMonthlyCount) * 100;
              
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded absolute -translate-y-10 transition-opacity duration-150 whitespace-nowrap shadow z-10">
                    {val} Ticket{val !== 1 ? 's' : ''}
                  </div>
                  {/* Bar */}
                  <div 
                    className="w-full bg-slate-200 dark:bg-slate-800 rounded-md group-hover:bg-gradient-premium transition-all duration-300 relative flex items-end overflow-hidden"
                    style={{ height: '120px' }}
                  >
                    <div 
                      className="w-full bg-primary/70 dark:bg-accent/60 rounded-md transition-all duration-500" 
                      style={{ height: `${pct || 4}%` }} // Ensure minor height if 0 to represent slot
                    ></div>
                  </div>
                  {/* Label */}
                  <span className="text-[10px] text-slate-400 font-bold">{month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Airline Distribution (Donut Chart) */}
        <div className="glass rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--card-border)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <PieChart className="w-4 h-4 text-primary dark:text-accent" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Airline Distribution</h3>
          </div>

          {/* SVG Donut */}
          <div className="flex flex-col items-center justify-center gap-5 my-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle 
                  className="text-slate-100 dark:text-slate-800" 
                  strokeWidth="3.5" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="16" 
                  cx="18" 
                  cy="18" 
                />
                
                {/* Segments Generator */}
                {(() => {
                  let accumulatedPercent = 0;
                  return airlineData.map((item, idx) => {
                    const strokeDashArray = `${item.percentage} ${100 - item.percentage}`;
                    const strokeDashOffset = 100 - accumulatedPercent;
                    accumulatedPercent += item.percentage;
                    
                    return (
                      <circle
                        key={item.name}
                        stroke={segmentColors[idx % segmentColors.length]}
                        strokeWidth="3.8"
                        strokeDasharray={strokeDashArray}
                        strokeDashoffset={strokeDashOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        r="16"
                        cx="18"
                        cy="18"
                        className="transition-all duration-500 hover:stroke-[4.5px] cursor-pointer"
                      >
                        <title>{`${item.name}: ${item.count}`}</title>
                      </circle>
                    );
                  });
                })()}
              </svg>
              
              <div className="absolute flex flex-col items-center">
                <span className="text-base font-bold text-slate-900 dark:text-white leading-none font-mono">
                  {totalTickets}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">Tickets</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-1.5 w-full">
              {airlineData.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segmentColors[idx % segmentColors.length] }}
                    ></span>
                    <span className="text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[120px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 font-bold">{item.percentage}% ({item.count})</span>
                </div>
              ))}
              {airlineData.length === 0 && (
                <span className="text-xs text-slate-400 text-center">No airline records found</span>
              )}
            </div>

          </div>
        </div>

        {/* CHART 3: Departure Trends (Area Line Chart) */}
        <div className="glass rounded-3xl p-5 md:p-6 lg:col-span-3 shadow-sm border border-[var(--card-border)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <TrendingUp className="w-4 h-4 text-primary dark:text-accent" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">Weekly Departure Activity</h3>
          </div>

          {/* SVG Area Chart */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="h-36 w-full">
              <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-800" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-800" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="0.5" className="dark:stroke-slate-800" />
                
                {/* Closed Area */}
                <polygon points={trendClosedPoints} fill="url(#areaGradient)" />
                {/* Wave Line */}
                <polyline 
                  points={trendPoints} 
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                
                {/* Dots on points */}
                {trendCounts.map((val, idx) => {
                  const step = 500 / (trendCounts.length - 1);
                  const cx = idx * step;
                  const cy = 150 - (val / maxTrendCount) * (150 - 20);
                  
                  return (
                    <circle 
                      key={idx} 
                      cx={cx} 
                      cy={cy} 
                      r="4" 
                      className="fill-white stroke-accent hover:r-6 cursor-pointer transition-all"
                      strokeWidth="2" 
                    />
                  );
                })}
              </svg>
            </div>
            
            {/* X-Axis labels */}
            <div className="flex justify-between px-1.5 text-[9px] text-slate-400 font-bold">
              {trendDays.map(day => <span key={day}>{day}</span>)}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
