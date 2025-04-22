import React, { useState, useEffect } from "react";

interface TrafficSnapshot {
  time: string;
  totalVehicles: number;
  congestionLevel: number;
  avgSpeed: number;
  entryPoints: {
    name: string;
    count: number;
  }[];
}

interface DayData {
  date: string;
  totalVehicles: number;
  peakCongestion: number;
  avgWaitTime: number;
}

const TrafficAnalyticsPage: React.FC = () => {
  const [selectedDateRange, setSelectedDateRange] = useState<"day" | "week" | "month">("week");
  const [isLoading, setIsLoading] = useState(true);
  const [trafficSnapshots, setTrafficSnapshots] = useState<TrafficSnapshot[]>([]);
  const [historicalData, setHistoricalData] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Load mock data
  useEffect(() => {
    setIsLoading(true);
    
    // Generate mock traffic snapshots
    setTimeout(() => {
      const mockSnapshots: TrafficSnapshot[] = [];
      const hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
      
      hours.forEach(hour => {
        const timeMultiplier = hour === "08:00" || hour === "18:00" ? 1.5 : 
                               hour === "12:00" ? 1.2 : 1;
        
        mockSnapshots.push({
          time: hour,
          totalVehicles: Math.floor(200 * timeMultiplier + Math.random() * 100),
          congestionLevel: Math.min(100, Math.floor(40 * timeMultiplier + Math.random() * 30)),
          avgSpeed: Math.max(5, Math.floor(30 / timeMultiplier + Math.random() * 10)),
          entryPoints: [
            { name: "North Gate", count: Math.floor(70 * timeMultiplier + Math.random() * 30) },
            { name: "East Gate", count: Math.floor(50 * timeMultiplier + Math.random() * 20) },
            { name: "West Gate", count: Math.floor(40 * timeMultiplier + Math.random() * 20) },
            { name: "South Gate", count: Math.floor(30 * timeMultiplier + Math.random() * 15) }
          ]
        });
      });
      
      setTrafficSnapshots(mockSnapshots);
      
      // Generate mock historical data
      const mockHistoricalData: DayData[] = [];
      const days = 7;
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const multiplier = isWeekend ? 1.4 : 1;
        
        mockHistoricalData.push({
          date: dateString,
          totalVehicles: Math.floor(2000 * multiplier + Math.random() * 500),
          peakCongestion: Math.min(100, Math.floor(70 * multiplier + Math.random() * 20)),
          avgWaitTime: Math.floor(15 * multiplier + Math.random() * 10)
        });
      }
      
      setHistoricalData(mockHistoricalData);
      setIsLoading(false);
    }, 1000);
  }, [selectedDate, selectedDateRange]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleDateRangeChange = (range: "day" | "week" | "month") => {
    setSelectedDateRange(range);
  };

  const getCongestionColor = (level: number) => {
    if (level < 30) return "text-green-600";
    if (level < 60) return "text-yellow-600";
    if (level < 85) return "text-orange-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getBarHeight = (value: number, max: number, maxHeightPx: number = 150) => {
    return (value / max) * maxHeightPx;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Traffic Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6 col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Traffic Time Distribution</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => handleDateRangeChange("day")}
                className={`px-3 py-1 rounded text-sm ${
                  selectedDateRange === "day"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => handleDateRangeChange("week")}
                className={`px-3 py-1 rounded text-sm ${
                  selectedDateRange === "week"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => handleDateRangeChange("month")}
                className={`px-3 py-1 rounded text-sm ${
                  selectedDateRange === "month"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Month
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-end h-64 mb-2">
                {trafficSnapshots.map((snapshot, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-12 bg-blue-500 rounded-t"
                      style={{
                        height: `${getBarHeight(snapshot.totalVehicles, 400)}px`,
                      }}
                    ></div>
                    <div className="text-xs mt-2 text-gray-600 font-medium">
                      {snapshot.time}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">Time of Day</div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Vehicle Count</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Summary</h2>
          
          <div className="mb-4">
            <label htmlFor="date" className="block text-gray-700 mb-2">
              Select Date:
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b pb-4">
                <div className="text-sm text-gray-600">Total Vehicles:</div>
                <div className="text-2xl font-bold">
                  {historicalData[historicalData.length - 1].totalVehicles.toLocaleString()}
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="text-sm text-gray-600">Peak Congestion:</div>
                <div className={`text-2xl font-bold ${getCongestionColor(
                  historicalData[historicalData.length - 1].peakCongestion
                )}`}>
                  {historicalData[historicalData.length - 1].peakCongestion}%
                </div>
              </div>
              
              <div className="border-b pb-4">
                <div className="text-sm text-gray-600">Average Wait Time:</div>
                <div className="text-2xl font-bold">
                  {historicalData[historicalData.length - 1].avgWaitTime} minutes
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Peak Entry Point:</div>
                <div className="text-2xl font-bold">
                  North Gate
                </div>
                <div className="text-sm text-gray-500">
                  37% of total traffic
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6 col-span-2">
          <h2 className="text-xl font-semibold mb-4">Historical Trends</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div>
              <div className="flex items-end h-64 mb-4">
                {historicalData.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1 mx-1"
                  >
                    <div className="flex h-40 items-end w-full">
                      <div
                        className="w-6 bg-green-500 rounded-t mx-1"
                        style={{
                          height: `${getBarHeight(day.totalVehicles, 3000)}px`,
                        }}
                      ></div>
                      <div
                        className="w-6 bg-red-500 rounded-t mx-1"
                        style={{
                          height: `${getBarHeight(day.peakCongestion, 100, 130)}px`,
                        }}
                      ></div>
                      <div
                        className="w-6 bg-blue-500 rounded-t mx-1"
                        style={{
                          height: `${getBarHeight(day.avgWaitTime, 30, 120)}px`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs mt-2 text-gray-600 font-medium">
                      {formatDate(day.date)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center items-center">
                <div className="flex items-center mr-4">
                  <div className="w-4 h-4 bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Total Vehicles</span>
                </div>
                <div className="flex items-center mr-4">
                  <div className="w-4 h-4 bg-red-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Peak Congestion (%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600">Avg Wait (min)</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Hot Spots & Bottlenecks</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-gray-500">Loading data...</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Temple Junction</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                  </div>
                  <div className="text-red-600 font-bold ml-2">92%</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">North Gate Entry</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                    </div>
                  </div>
                  <div className="text-orange-600 font-bold ml-2">78%</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Market Square</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                  </div>
                  <div className="text-yellow-600 font-bold ml-2">65%</div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">West Road</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                  </div>
                  <div className="text-green-600 font-bold ml-2">42%</div>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h3 className="font-semibold text-red-800 mb-2">Critical Alert</h3>
                <p className="text-sm text-gray-700">
                  Temple Junction has consistently exceeded 90% congestion during evening hours (16:00-19:00). Consider implementing alternating traffic flow during these hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">AI-Driven Insights</h2>
        
        <div className="border-l-4 border-blue-500 pl-4 mb-4">
          <h3 className="font-medium text-blue-800 mb-1">Traffic Pattern Analysis</h3>
          <p className="text-gray-700">
            The system has detected recurring congestion patterns on weekends between 10:00-14:00 at Temple Junction. This appears to be correlated with the weekend market activity. Consider implementing time-based entry restrictions for large vehicles during this period.
          </p>
        </div>
        
        <div className="border-l-4 border-green-500 pl-4 mb-4">
          <h3 className="font-medium text-green-800 mb-1">Improvement Opportunity</h3>
          <p className="text-gray-700">
            Based on historical data, redistributing 30% of North Gate traffic to West Gate during peak hours could reduce overall congestion by approximately 22%. This could be achieved through digital signage and pre-visit information.
          </p>
        </div>
        
        <div className="border-l-4 border-purple-500 pl-4 mb-4">
          <h3 className="font-medium text-purple-800 mb-1">Event Impact Forecast</h3>
          <p className="text-gray-700">
            The upcoming festival on {new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} is expected to increase traffic by 85% compared to a normal day. Simulation suggests implementing entry time slots could maintain congestion below critical levels.
          </p>
        </div>
        
        <div className="border-l-4 border-yellow-500 pl-4">
          <h3 className="font-medium text-yellow-800 mb-1">Weather Alert</h3>
          <p className="text-gray-700">
            Heavy rain is forecast for next Tuesday. Based on previous patterns, this typically slows traffic flow by 25-30% and increases congestion at covered areas. Consider extending market hours to distribute visitor load.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrafficAnalyticsPage; 