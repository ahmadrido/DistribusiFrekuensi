import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export default function FrequencyDistributionCalculator() {
  const [data, setData] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);

  const handleFileUpload = async (e) => {
    setError("");
    setLoading(true);
    const file = e.target.files[0];
    
    if (!file) {
      setFileSelected(false);
      setLoading(false);
      return;
    }
    
    setFileSelected(true);
    
    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let values = [];
      
      if (fileExtension === 'csv') {
        // Handle CSV file
        const text = await file.text();
        const result = Papa.parse(text, { 
          header: false,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        // Extract all numeric values from the CSV
        values = result.data.flat().filter(value => typeof value === 'number');
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        // Handle Excel file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extract all numeric values
        values = jsonData.flat().filter(value => typeof value === 'number');
      } else {
        throw new Error("Format file tidak didukung. Harap upload file Excel (.xlsx, .xls) atau CSV.");
      }
      
      if (values.length === 0) {
        throw new Error("Tidak ada data numerik yang ditemukan dalam file.");
      }
      
      setData(values);
      calculateFrequencyDistribution(values);
    } catch (err) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat membaca file.");
    } finally {
      setLoading(false);
    }
  };

  const calculateFrequencyDistribution = (values) => {
    // 1. Sort data for easier processing
    const sortedData = [...values].sort((a, b) => a - b);
    
    // 2. Find range (R = Xmax - Xmin)
    const minValue = Math.min(...sortedData);
    const maxValue = Math.max(...sortedData);
    const range = maxValue - minValue;
    
    // 3. Calculate number of classes (K = 1 + 3.3 log n)
    const n = sortedData.length;
    const rawNumberOfClasses = 1 + 3.3 * Math.log10(n);
    // Round up for number of classes (ceiling function)
    const numberOfClasses = Math.ceil(rawNumberOfClasses);
    
    // 4. Calculate class width (PK = range / number of classes)
    const rawClassWidth = range / numberOfClasses;
    // Round up for class width (ceiling function)
    const classWidth = Math.ceil(rawClassWidth);
    
    // Store raw values for display
    const rawValues = {
      rawNumberOfClasses,
      rawClassWidth
    };
    
    // 5-8. Create class intervals and calculate frequencies
    const frequencyTable = [];
    
    // Start from the minimum value, rounded down if needed to create clean intervals
    let lowerLimit = minValue;
    
    for (let i = 0; i < numberOfClasses; i++) {
      const upperLimit = lowerLimit + classWidth - 1; // Upper limit is (lower + width - 1)
      const lowerEdge = lowerLimit - 0.5;
      const upperEdge = upperLimit + 0.5;
      const midpoint = (lowerLimit + upperLimit) / 2;
      
      // Count frequency
      const frequency = sortedData.filter(
        value => value >= lowerLimit && value <= upperLimit
      ).length;
      
      frequencyTable.push({
        lowerEdge,
        classInterval: `${lowerLimit} - ${upperLimit}`,
        upperEdge,
        midpoint,
        frequency
      });
      
      lowerLimit = upperLimit + 1; // Next class starts at previous upper limit + 1
    }
    
    setResults({
      data: sortedData,
      minValue,
      maxValue,
      range,
      numberOfClasses,
      rawNumberOfClasses: rawValues.rawNumberOfClasses,
      classWidth,
      rawClassWidth: rawValues.rawClassWidth,
      frequencyTable
    });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Kalkulator Distribusi Frekuensi</h1>
      
      <div className="mb-6 p-4 border border-gray-300 rounded">
        <h2 className="text-lg font-semibold mb-2">Unggah Data</h2>
        <p className="mb-2 text-sm">Unggah file Excel (.xlsx, .xls) atau CSV yang berisi data angka</p>
        
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="border border-gray-300 p-2 rounded w-full"
          />
        </div>
        
        {loading && <p className="mt-2 text-blue-600">Memproses data...</p>}
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </div>
      
      {/* Data Grid (10x10 format) */}
      {data.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Data Asli</h2>
          <div className="overflow-x-auto">
            <table className="border border-gray-300 min-w-full">
              <tbody>
                {Array.from({ length: Math.ceil(data.length / 10) }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 10 }).map((_, colIndex) => {
                      const dataIndex = rowIndex * 10 + colIndex;
                      return dataIndex < data.length ? (
                        <td key={colIndex} className="border border-gray-300 p-2 text-center">
                          {data[dataIndex]}
                        </td>
                      ) : (
                        <td key={colIndex} className="border border-gray-300 p-2"></td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {results && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Hasil Perhitungan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-100 p-3 rounded">
              <p><strong>Data:</strong> {results.data.length} nilai</p>
              <p><strong>Nilai Minimum:</strong> {results.minValue}</p>
              <p><strong>Nilai Maksimum:</strong> {results.maxValue}</p>
            </div>
            
            <div className="bg-gray-100 p-3 rounded">
              <p><strong>Rentang (R):</strong> {results.range}</p>
              <p><strong>Banyak Kelas (K):</strong> {results.numberOfClasses} (K = 1 + 3,3 log {results.data.length} = {results.rawNumberOfClasses.toFixed(3)} → dibulatkan ke atas)</p>
              <p><strong>Panjang Kelas (PK):</strong> {results.classWidth} (PK = {results.range} / {results.numberOfClasses} = {results.rawClassWidth.toFixed(3)} → dibulatkan ke atas)</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2">Tepi Bawah</th>
                  <th className="border border-gray-300 p-2">Nilai Kelas</th>
                  <th className="border border-gray-300 p-2">Tepi Atas</th>
                  <th className="border border-gray-300 p-2">Nilai Tengah</th>
                  <th className="border border-gray-300 p-2">Frekuensi</th>
                </tr>
              </thead>
              <tbody>
                {results.frequencyTable.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border border-gray-300 p-2 text-center">{row.lowerEdge.toFixed(1)}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.classInterval}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.upperEdge.toFixed(1)}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.midpoint}</td>
                    <td className="border border-gray-300 p-2 text-center">{row.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Data Terurut</h2>
          <div className="overflow-x-auto">
            <table className="border border-gray-300 min-w-full">
              <tbody>
                {Array.from({ length: Math.ceil(results.data.length / 10) }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 10 }).map((_, colIndex) => {
                      const dataIndex = rowIndex * 10 + colIndex;
                      return dataIndex < results.data.length ? (
                        <td key={colIndex} className="border border-gray-300 p-2 text-center">
                          {results.data[dataIndex]}
                        </td>
                      ) : (
                        <td key={colIndex} className="border border-gray-300 p-2"></td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}