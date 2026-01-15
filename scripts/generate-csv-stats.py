import csv
from collections import defaultdict
from datetime import datetime
import json

# Read the CSV file
with open('user_read_only_context/text_attachments/gc_export-kPxrS.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    rows = list(reader)

# Process categories
category_stats = defaultdict(lambda: {"count": 0, "dates": []})
geo_stats = defaultdict(lambda: {"count": 0, "dates": []})
template_stats = defaultdict(lambda: {"count": 0, "dates": []})

for row in rows:
    date_str = row.get('data_pubblicazione', '')
    category = row.get('category', 'NULL')
    geo = row.get('geo', 'NULL')
    template = row.get('template_articolo', 'NULL')
    
    # Process category
    if category and category != 'NULL':
        # Handle multiple categories separated by comma
        for cat in category.split(','):
            cat = cat.strip()
            if cat:
                category_stats[cat]["count"] += 1
                if date_str:
                    category_stats[cat]["dates"].append(date_str)
    
    # Process geo
    if geo and geo != 'NULL':
        geo_stats[geo]["count"] += 1
        if date_str:
            geo_stats[geo]["dates"].append(date_str)
    
    # Process template
    if template and template != 'NULL':
        # Clean template name
        clean_template = template
        if clean_template.startswith('templates/post-'):
            clean_template = clean_template[15:]  # Remove 'templates/post-'
        if clean_template.endswith('.php'):
            clean_template = clean_template[:-4]  # Remove '.php'
        template_stats[clean_template]["count"] += 1
        if date_str:
            template_stats[clean_template]["dates"].append(date_str)

def calculate_stats(stats_dict):
    results = []
    for name, data in stats_dict.items():
        count = data["count"]
        dates = data["dates"]
        
        # Parse dates and find the latest
        parsed_dates = []
        for d in dates:
            try:
                parsed_dates.append(datetime.strptime(d.split()[0], '%Y-%m-%d'))
            except:
                pass
        
        if parsed_dates:
            parsed_dates.sort()
            last_entry = parsed_dates[-1].strftime('%Y-%m-%d')
            
            # Calculate frequency
            if len(parsed_dates) > 1:
                first_date = parsed_dates[0]
                last_date = parsed_dates[-1]
                total_days = (last_date - first_date).days
                if total_days > 0 and count > 1:
                    avg_days = total_days / (count - 1)
                    frequency = f"1 every {avg_days:.1f} days"
                else:
                    frequency = "N/A"
            else:
                frequency = "N/A"
        else:
            last_entry = "N/A"
            frequency = "N/A"
        
        results.append({
            "name": name,
            "count": count,
            "lastEntry": last_entry,
            "frequency": frequency
        })
    
    # Sort by count descending
    results.sort(key=lambda x: x["count"], reverse=True)
    return results

category_results = calculate_stats(category_stats)
geo_results = calculate_stats(geo_stats)
template_results = calculate_stats(template_stats)

output = {
    "categories": category_results,
    "geos": geo_results,
    "templates": template_results,
    "totalArticles": len(rows)
}

print(json.dumps(output, indent=2, ensure_ascii=False))
