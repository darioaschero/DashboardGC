import csv
from datetime import datetime
from collections import defaultdict

# Read the CSV file
file_path = "user_read_only_context/text_attachments/gc_export-kPxrS.csv"

# Data structures to hold our statistics
category_stats = defaultdict(lambda: {"count": 0, "dates": []})
geo_stats = defaultdict(lambda: {"count": 0, "dates": []})
template_stats = defaultdict(lambda: {"count": 0, "dates": []})

with open(file_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        date_str = row['data_pubblicazione']
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        except:
            continue
        
        # Category stats
        category = row['category']
        if category and category != 'NULL':
            category_stats[category]["count"] += 1
            category_stats[category]["dates"].append(date)
        
        # Geo stats
        geo = row['geo']
        if geo and geo != 'NULL':
            geo_stats[geo]["count"] += 1
            geo_stats[geo]["dates"].append(date)
        
        # Template stats
        template = row['template_articolo']
        if template and template != 'NULL':
            # Format template name
            formatted_template = template.replace('templates/post-', '').replace('.php', '')
            template_stats[formatted_template]["count"] += 1
            template_stats[formatted_template]["dates"].append(date)

def calculate_frequency(dates):
    """Calculate average frequency in days between entries"""
    if len(dates) < 2:
        return "N/A"
    sorted_dates = sorted(dates)
    first_date = sorted_dates[0]
    last_date = sorted_dates[-1]
    total_days = (last_date - first_date).days
    if total_days == 0:
        return "< 1 day"
    avg_days = total_days / (len(dates) - 1)
    return f"{avg_days:.1f} days"

def print_table(title, stats):
    print(f"\n{'='*80}")
    print(f" {title}")
    print('='*80)
    print(f"{'Name':<45} {'Count':>8} {'Last Entry':<12} {'Frequency':<15}")
    print('-'*80)
    
    # Sort by count descending
    sorted_stats = sorted(stats.items(), key=lambda x: x[1]["count"], reverse=True)
    
    for name, data in sorted_stats:
        count = data["count"]
        last_date = max(data["dates"]).strftime('%Y-%m-%d') if data["dates"] else "N/A"
        frequency = calculate_frequency(data["dates"])
        # Truncate long names
        display_name = name[:42] + "..." if len(name) > 45 else name
        print(f"{display_name:<45} {count:>8} {last_date:<12} 1 every {frequency:<10}")

print_table("CATEGORY STATISTICS", category_stats)
print_table("GEO STATISTICS", geo_stats)
print_table("TEMPLATE STATISTICS", template_stats)

print(f"\n\nSummary:")
print(f"Total unique categories: {len(category_stats)}")
print(f"Total unique geo locations: {len(geo_stats)}")
print(f"Total unique templates: {len(template_stats)}")
