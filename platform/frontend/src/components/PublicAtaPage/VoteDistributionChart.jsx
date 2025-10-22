import React from 'react';
import { useTranslation } from "react-i18next";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const VoteDistributionChart = ({ votingData }) => {
  const { t } = useTranslation();
  
  // Calculate total votes
  const totalVotes = votingData.votos_favor_total + votingData.votos_contra_total + votingData.abstencoes_total;
  
  // Prepare data for the pie chart
  const pieChartData = {
    labels: [t("in_favor"), t("against"), t("abstentions")],
    datasets: [
      {
        data: [
          votingData.votos_favor_total,
          votingData.votos_contra_total,
          votingData.abstencoes_total
        ],
        backgroundColor: [
          'rgba(72, 187, 120, 0.7)',  // green for in favor
          'rgba(245, 101, 101, 0.7)', // red for against
          'rgba(160, 174, 192, 0.7)'  // gray for abstentions
        ],
        borderColor: [
          'rgb(72, 187, 120)',
          'rgb(245, 101, 101)',
          'rgb(160, 174, 192)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options with datalabels plugin
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Montserrat, sans-serif',
            size: 12
          },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const percentage = totalVotes > 0
              ? Math.round((value / totalVotes) * 100)
              : 0;
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      },
      // Display labels inside the pie chart
      datalabels: {
        color: 'white',
        font: {
          weight: 'bold',
          size: 14
        },
        formatter: (value, ctx) => {
          // Don't show labels for segments with 0 value
          if (value === 0) return '';
          
          // Calculate percentage
          const percentage = totalVotes > 0
            ? Math.round((value / totalVotes) * 100)
            : 0;
            
          // Show both the value and percentage
          return `${value}\n(${percentage}%)`;
        }
      }
    }
  };

  if (totalVotes === 0) {
    return (
      <div className="h-24 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
        {t("no_votes_recorded")}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center">
      {/* Pie chart will take 60% width on medium and larger screens */}
      <div className="w-full md:w-3/5 h-64">
        <Pie data={pieChartData} options={pieChartOptions} />
      </div>
      
      {/* Legend and vote counts - will take 40% width on medium and larger screens */}
      <div className="w-full md:w-2/5 mt-4 md:mt-0 px-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t("in_favor")}</div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-green-600">{votingData.votos_favor_total}</span>
                <span className="text-gray-500">
                  {totalVotes > 0 ? Math.round((votingData.votos_favor_total / totalVotes) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t("against")}</div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-red-600">{votingData.votos_contra_total}</span>
                <span className="text-gray-500">
                  {totalVotes > 0 ? Math.round((votingData.votos_contra_total / totalVotes) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-400 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t("abstentions")}</div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-600">{votingData.abstencoes_total}</span>
                <span className="text-gray-500">
                  {totalVotes > 0 ? Math.round((votingData.abstencoes_total / totalVotes) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-200 mt-2">
            <div className="flex justify-between">
              <div className="text-sm font-medium">{t("total_votes")}</div>
              <div className="text-sm font-bold">{totalVotes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteDistributionChart;