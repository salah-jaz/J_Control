export const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
        if (window.confirm("No data to export. Do you want to download an empty template?")) {
            // proceed with empty template if needed, or just return
            return;
        }
        return;
    }

    // extract all possible keys from all objects to ensure we cover everything, 
    // or just use the keys from the first object if structure is consistent.
    // Assuming consistent structure for now based on the component code.
    const headers = Object.keys(data[0]);

    const csvContent = [
        headers.join(","),
        ...data.map((row) =>
            headers
                .map((header) => {
                    let value = row[header];
                    // Handle null/undefined
                    if (value === null || value === undefined) {
                        return "";
                    }
                    // Convert to string to safely handle all types
                    value = String(value);

                    // Handle commas and quotes in data
                    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                })
                .join(",")
        ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
