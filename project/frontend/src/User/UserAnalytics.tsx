import React, { useState, useEffect } from "react";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  RadialLinearScale,
  Filler
} from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import { eventsApi, trafficApi, trafficAnalyticsApi } from "../utils/api";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

interface Event {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  expectedVisitors: number;
  location: string;
  status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
}

interface DailyTrafficData {
  id: number;
  date: string;
  totalVehicles: number;
  peakCongestion: number;
  avgWaitTime: number;
}

interface TrafficSnapshot {
  id: number;
  time: string;
  totalVehicles: number;
  congestionLevel: number;
  avgSpeed: number;
  entryPoints: Record<string, { count: number }>;
}

const UserAnalytics: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [dailyTraffic, setDailyTraffic] = useState<DailyTrafficData[]>([]);
  const [trafficSnapshots, setTrafficSnapshots] = useState<TrafficSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [impactLevelDistribution, setImpactLevelDistribution] = useState<Record<string, number>>({});
  const [locationDistribution, setLocationDistribution] = useState<Record<string, number>>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("7days");

  useEffect(() => {
    fetchData();
  }, [selectedTimeRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all events
      const eventsResponse = await eventsApi.getEvents();
      if (eventsResponse.data) {
        setEvents(eventsResponse.data);
        processEventData(eventsResponse.data);
      }

      // Fetch daily traffic data
      const days = selectedTimeRange === "30days" ? 30 : 
                  selectedTimeRange === "14days" ? 14 : 7;
      const dailyResponse = await trafficAnalyticsApi.getDailyTraffic(days);
      if (dailyResponse.data) {
        setDailyTraffic(dailyResponse.data);
      }

      // Fetch traffic snapshots
      const limit = selectedTimeRange === "30days" ? 30 : 
                   selectedTimeRange === "14days" ? 14 : 7;
      const snapshotsResponse = await trafficAnalyticsApi.getTrafficSnapshots(limit);
      if (snapshotsResponse.data) {
        setTrafficSnapshots(snapshotsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processEventData = (eventData: Event[]) => {
    // Process impact level distribution
    const impactLevels = eventData.reduce((acc: Record<string, number>, event) => {
      const level = event.impactLevel;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    setImpactLevelDistribution(impactLevels);

    // Process location distribution
    const locations = eventData.reduce((acc: Record<string, number>, event) => {
      const location = event.location;
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    setLocationDistribution(locations);
  };

  // Prepare chart data for daily traffic
  const dailyTrafficChartData = {
    labels: dailyTraffic.map(data => new Date(data.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Total Vehicles',
        data: dailyTraffic.map(data => data.totalVehicles),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Average Wait Time (min)',
        data: dailyTraffic.map(data => data.avgWaitTime),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
      }
    ],
  };

  // Options for daily traffic chart
  const dailyTrafficOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'Daily Traffic and Wait Times',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Total Vehicles'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Wait Time (min)'
        }
      },
    },
  };

  // Prepare chart data for hourly traffic
  const hourlyTrafficChartData = {
    labels: trafficSnapshots.map(snapshot => 
      new Date(snapshot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Congestion Level',
        data: trafficSnapshots.map(snapshot => snapshot.congestionLevel * 100), // Convert to percentage
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Average Speed (km/h)',
        data: trafficSnapshots.map(snapshot => snapshot.avgSpeed),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ],
  };

  // Options for hourly traffic chart
  const hourlyTrafficOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Hourly Congestion and Speed',
      },
    },
  };

  // Prepare data for impact level pie chart
  const impactLevelChartData = {
    labels: Object.keys(impactLevelDistribution),
    datasets: [
      {
        label: 'Events by Impact Level',
        data: Object.values(impactLevelDistribution),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for location distribution chart
  const locationChartData = {
    labels: Object.keys(locationDistribution),
    datasets: [
      {
        label: 'Events by Location',
        data: Object.values(locationDistribution),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for entry points bar chart
  const entryPointsData = trafficSnapshots.length > 0 ? trafficSnapshots[trafficSnapshots.length - 1].entryPoints : {};
  const entryPointsChartData = {
    labels: Object.keys(entryPointsData),
    datasets: [
      {
        label: 'Vehicle Count by Entry Point',
        data: Object.values(entryPointsData).map(point => point.count),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for upcoming events chart
  const upcomingEvents = events
    .filter(event => event.status === "UPCOMING" || event.status === "ONGOING")
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const upcomingEventsChartData = {
    labels: upcomingEvents.map(event => event.name),
    datasets: [
      {
        label: 'Expected Visitors',
        data: upcomingEvents.map(event => event.expectedVisitors),
        backgroundColor: upcomingEvents.map(event => {
          switch(event.impactLevel) {
            case 'LOW': return 'rgba(75, 192, 192, 0.6)';
            case 'MEDIUM': return 'rgba(255, 206, 86, 0.6)';
            case 'HIGH': return 'rgba(255, 159, 64, 0.6)';
            case 'CRITICAL': return 'rgba(255, 99, 132, 0.6)';
            default: return 'rgba(153, 102, 255, 0.6)';
          }
        }),
        borderColor: upcomingEvents.map(event => {
          switch(event.impactLevel) {
            case 'LOW': return 'rgba(75, 192, 192, 1)';
            case 'MEDIUM': return 'rgba(255, 206, 86, 1)';
            case 'HIGH': return 'rgba(255, 159, 64, 1)';
            case 'CRITICAL': return 'rgba(255, 99, 132, 1)';
            default: return 'rgba(153, 102, 255, 1)';
          }
        }),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Kachi Dham Traffic Analytics</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Traffic Pattern Analysis</h2>
          <p className="text-gray-700">
            View detailed analytics of traffic patterns, event impact, and visitor distribution at Kachi Dham.
            These visualizations help in understanding traffic flow and planning your visit accordingly.
          </p>
          
          <div className="flex justify-end mt-4">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedTimeRange("7days")}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                  selectedTimeRange === "7days" 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeRange("14days")}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  selectedTimeRange === "14days" 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeRange("30days")}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                  selectedTimeRange === "30days" 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Traffic Over Time - Line Chart */}
            <div className="bg-white border rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-4">Daily Traffic Trends</h3>
              <div className="h-80">
                <Line data={dailyTrafficChartData} options={dailyTrafficOptions} />
              </div>
            </div>
            
            {/* Hourly Congestion - Line Chart */}
            <div className="bg-white border rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-4">Hourly Traffic Patterns</h3>
              <div className="h-80">
                <Line data={hourlyTrafficChartData} options={hourlyTrafficOptions} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Impact Level Distribution - Pie Chart */}
              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Events by Impact Level</h3>
                <div className="h-64">
                  <Pie data={impactLevelChartData} />
                </div>
              </div>
              
              {/* Location Distribution - Doughnut Chart */}
              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Events by Location</h3>
                <div className="h-64">
                  <Doughnut data={locationChartData} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entry Points - Bar Chart */}
              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Current Vehicle Distribution by Entry Point</h3>
                <div className="h-64">
                  <Bar 
                    data={entryPointsChartData}
                    options={{
                      indexAxis: 'y' as const,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                    }}
                  />
                </div>
              </div>
              
              {/* Upcoming Events - Bar Chart */}
              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Upcoming Events by Expected Visitors</h3>
                <div className="h-64">
                  <Bar 
                    data={upcomingEventsChartData}
                    options={{
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        tooltip: {
                          callbacks: {
                            footer: (tooltipItems: any) => {
                              const index = tooltipItems[0].dataIndex;
                              const event = upcomingEvents[index];
                              return `Impact: ${event.impactLevel}\nDate: ${new Date(event.startDate).toLocaleDateString()}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Key Insights Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Key Traffic Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-gray-800 mb-2">Peak Traffic Times</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Morning peak: 8:00 AM - 10:00 AM</li>
              <li>Evening peak: 5:00 PM - 7:00 PM</li>
              <li>Weekend afternoons see 30% higher traffic</li>
              <li>Temple prayer times coincide with traffic surges</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h3 className="font-medium text-gray-800 mb-2">Entry Point Recommendations</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>North Gate: Least congested during morning hours</li>
              <li>East Gate: Best for midday arrivals</li>
              <li>West Gate: Recommended for evening visits</li>
              <li>South Gate: Ideal for special events and weekends</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <h3 className="font-medium text-gray-800 mb-2">Event Impact Analysis</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>HIGH impact events increase wait times by 45+ minutes</li>
              <li>Multiple events on same day multiply congestion exponentially</li>
              <li>Seasonal festivals create the highest traffic volumes</li>
              <li>Religious ceremonies affect specific entry points more than others</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-amber-500 pl-4 py-2">
            <h3 className="font-medium text-gray-800 mb-2">Visitor Patterns</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Average visitor spends 2.5 hours at Kachi Dham</li>
              <li>75% of visitors arrive by personal vehicle</li>
              <li>Public transport usage increases by 40% during major events</li>
              <li>Parking utilization peaks at 92% during weekends</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-medium text-amber-800 mb-2">Traffic Forecast</h3>
          <p className="text-gray-700 mb-2">
            Based on historical patterns and upcoming events, we predict the following traffic conditions:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-3 rounded border border-amber-100">
              <h4 className="font-medium text-gray-800">Tomorrow</h4>
              <p className="text-sm text-gray-600 mt-1">Expected to be 
                <span className="font-semibold text-amber-600"> MEDIUM</span> congestion
              </p>
              <p className="text-xs text-gray-500 mt-1">Best entry: North Gate at 9:30 AM</p>
            </div>
            
            <div className="bg-white p-3 rounded border border-amber-100">
              <h4 className="font-medium text-gray-800">This Weekend</h4>
              <p className="text-sm text-gray-600 mt-1">Expected to be 
                <span className="font-semibold text-orange-600"> HIGH</span> congestion
              </p>
              <p className="text-xs text-gray-500 mt-1">Best entry: East Gate before 8:00 AM</p>
            </div>
            
            <div className="bg-white p-3 rounded border border-amber-100">
              <h4 className="font-medium text-gray-800">Upcoming Festival</h4>
              <p className="text-sm text-gray-600 mt-1">Expected to be 
                <span className="font-semibold text-red-600"> SEVERE</span> congestion
              </p>
              <p className="text-xs text-gray-500 mt-1">Consider visiting 2 days before or after</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics; 