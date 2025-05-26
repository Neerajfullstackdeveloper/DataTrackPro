import { db } from "./db";
import { companies, facebookData } from "@shared/schema";

const demoCompanies = [
  {
    name: "Alpha Tech Solutions",
    industry: "Technology",
    email: "contact@alphatech.com",
    phone: "9876543210",
    address: "101 Silicon Avenue, Bangalore, Karnataka",
    website: "www.alphatech.com",
    companySize: "Medium",
    notes: "Products: AI Software, Cloud Hosting\nServices: IT Consulting, System Integration",
    status: "active"
  },
  {
    name: "Blue Wave Industries",
    industry: "Manufacturing",
    email: "info@bluewave.com",
    phone: "9123456780",
    address: "204 Industrial Zone, Pune, Maharashtra",
    website: "www.bluewave.com",
    companySize: "Large",
    notes: "Products: Hydraulic Pumps, Industrial Valves\nServices: Machinery Maintenance",
    status: "active"
  },
  {
    name: "Green Leaf Organics",
    industry: "Agriculture",
    email: "support@greenleaf.in",
    phone: "8899776655",
    address: "14 Green Street, Nashik, Maharashtra",
    website: "www.greenleaf.in",
    companySize: "Medium",
    notes: "Products: Organic Fertilizers, Bio Pesticides\nServices: Farming Consultation",
    status: "active"
  },
  {
    name: "PixelCraft Media",
    industry: "Media",
    email: "hello@pixelcraftmedia.com",
    phone: "9812345678",
    address: "501, Cyber Park, Hyderabad, Telangana",
    website: "www.pixelcraftmedia.com",
    companySize: "Small",
    notes: "Products: Motion Graphics, Brand Kits\nServices: Social Media Marketing, Video Editing",
    status: "active"
  },
  {
    name: "AquaTech Equipments",
    industry: "Manufacturing",
    email: "sales@aquatech.com",
    phone: "9001234567",
    address: "11 Water Lane, Surat, Gujarat",
    website: "www.aquatech.com",
    companySize: "Medium",
    notes: "Products: Water Filters, RO Units\nServices: Installation, AMC Services",
    status: "active"
  },
  {
    name: "NextGen Mobiles",
    industry: "Technology",
    email: "info@nextgenmobiles.in",
    phone: "9988776655",
    address: "3rd Floor, Megamall, Mumbai, Maharashtra",
    website: "www.nextgenmobiles.in",
    companySize: "Large",
    notes: "Products: Smartphones, Tablets\nServices: Customer Support, Repairs",
    status: "active"
  },
  {
    name: "SecureNet Systems",
    industry: "Technology",
    email: "contact@securenet.com",
    phone: "9123098765",
    address: "A-55, Tech Enclave, Noida, Uttar Pradesh",
    website: "www.securenet.com",
    companySize: "Medium",
    notes: "Products: Firewall Appliances, VPN Routers\nServices: Network Security, IT Audits",
    status: "active"
  },
  {
    name: "Royal Furniture Mart",
    industry: "Retail",
    email: "sales@royalfurnitures.com",
    phone: "9955667788",
    address: "Main Market, Ludhiana, Punjab",
    website: "www.royalfurnitures.com",
    companySize: "Medium",
    notes: "Products: Wooden Sofas, Dining Tables\nServices: Custom Design, Home Delivery",
    status: "active"
  },
  {
    name: "SolarShine Energy",
    industry: "Energy",
    email: "contact@solarshine.in",
    phone: "9012341234",
    address: "Near Solar Park, Jaipur, Rajasthan",
    website: "www.solarshine.in",
    companySize: "Medium",
    notes: "Products: Solar Panels, Inverters\nServices: Installation, Maintenance",
    status: "active"
  },
  {
    name: "FreshBox Retail",
    industry: "Retail",
    email: "info@freshboxretail.com",
    phone: "9876540987",
    address: "Market Street, Kochi, Kerala",
    website: "www.freshboxretail.com",
    companySize: "Medium",
    notes: "Products: Packaged Vegetables, Frozen Fruits\nServices: Cold Chain Supply",
    status: "active"
  },
  {
    name: "BuildRight Constructions",
    industry: "Construction",
    email: "buildright@construction.in",
    phone: "9090909090",
    address: "Civil Lines, Kanpur, Uttar Pradesh",
    website: "www.buildright.in",
    companySize: "Large",
    notes: "Products: Cement, Steel Bars\nServices: Building Contracts, Interior Designing",
    status: "active"
  },
  {
    name: "Urban Wear Co.",
    industry: "Retail",
    email: "sales@urbanwearco.com",
    phone: "9871234567",
    address: "Fashion Plaza, Ahmedabad, Gujarat",
    website: "www.urbanwearco.com",
    companySize: "Medium",
    notes: "Products: T-Shirts, Denim Jeans\nServices: Retailing, Custom Printing",
    status: "active"
  },
  {
    name: "Medico Plus Pharma",
    industry: "Healthcare",
    email: "contact@medicoplus.com",
    phone: "9988772233",
    address: "Sector 22, Chandigarh",
    website: "www.medicoplus.com",
    companySize: "Large",
    notes: "Products: Antibiotics, Painkillers\nServices: Distribution, Home Delivery",
    status: "active"
  },
  {
    name: "FinEdge Financials",
    industry: "Finance",
    email: "support@finedge.com",
    phone: "9832123456",
    address: "Downtown Towers, Kolkata, West Bengal",
    website: "www.finedge.com",
    companySize: "Large",
    notes: "Products: Mutual Funds, Insurance\nServices: Wealth Management, Loan Assistance",
    status: "active"
  },
  {
    name: "Bright Minds Academy",
    industry: "Education",
    email: "info@brightminds.edu",
    phone: "9711123456",
    address: "Education Hub, Indore, Madhya Pradesh",
    website: "www.brightminds.edu",
    companySize: "Medium",
    notes: "Products: Study Material, Online Courses\nServices: Coaching, Career Counseling",
    status: "active"
  },
  {
    name: "AutoSpark Spares",
    industry: "Automotive",
    email: "orders@autospark.com",
    phone: "9900887766",
    address: "Sector 12, Gurgaon, Haryana",
    website: "www.autospark.com",
    companySize: "Medium",
    notes: "Products: Brake Pads, Engine Oil\nServices: Garage Support, Vehicle Diagnostics",
    status: "active"
  },
  {
    name: "BakeHouse Delights",
    industry: "Food",
    email: "orders@bakehouse.in",
    phone: "9887766554",
    address: "Market Road, Bhopal, Madhya Pradesh",
    website: "www.bakehouse.in",
    companySize: "Small",
    notes: "Products: Cakes, Cookies\nServices: Event Catering, Online Delivery",
    status: "active"
  },
  {
    name: "TrekZone Gears",
    industry: "Sports",
    email: "sales@trekzone.com",
    phone: "9776655443",
    address: "Himalaya Road, Dehradun, Uttarakhand",
    website: "www.trekzone.com",
    companySize: "Small",
    notes: "Products: Trekking Bags, Climbing Gear\nServices: Adventure Tours, Rentals",
    status: "active"
  },
  {
    name: "PrintHub Solutions",
    industry: "Printing",
    email: "hello@printhub.in",
    phone: "9765432100",
    address: "IT Park, Mohali, Punjab",
    website: "www.printhub.in",
    companySize: "Medium",
    notes: "Products: Business Cards, Posters\nServices: Offset Printing, Digital Printing",
    status: "active"
  },
  {
    name: "EcoNest Interiors",
    industry: "Interior Design",
    email: "contact@econestinteriors.com",
    phone: "9654321987",
    address: "Interior Lane, Bhubaneswar, Odisha",
    website: "www.econestinteriors.com",
    companySize: "Medium",
    notes: "Products: Modular Kitchens, Wardrobes\nServices: Interior Design, 3D Rendering",
    status: "active"
  }
];

const facebookDataSeed = [
  {
    companyName: "Alpha Tech Solutions",
    address: "101 Silicon Avenue, Bangalore, Karnataka",
    email: "contact@alphatech.com",
    contact: "9876543210",
    products: ["AI Software", "Cloud Hosting"],
    services: ["IT Consulting", "System Integration"],
    quantity: 50
  },
  {
    companyName: "Blue Wave Industries",
    address: "204 Industrial Zone, Pune, Maharashtra",
    email: "info@bluewave.com",
    contact: "9123456780",
    products: ["Hydraulic Pumps", "Industrial Valves"],
    services: ["Machinery Maintenance"],
    quantity: 120
  },
  {
    companyName: "Green Leaf Organics",
    address: "14 Green Street, Nashik, Maharashtra",
    email: "support@greenleaf.in",
    contact: "8899776655",
    products: ["Organic Fertilizers", "Bio Pesticides"],
    services: ["Farming Consultation"],
    quantity: 200
  },
  {
    companyName: "PixelCraft Media",
    address: "501, Cyber Park, Hyderabad, Telangana",
    email: "hello@pixelcraftmedia.com",
    contact: "9812345678",
    products: ["Motion Graphics", "Brand Kits"],
    services: ["Social Media Marketing", "Video Editing"],
    quantity: 40
  },
  {
    companyName: "AquaTech Equipments",
    address: "11 Water Lane, Surat, Gujarat",
    email: "sales@aquatech.com",
    contact: "9001234567",
    products: ["Water Filters", "Reverse Osmosis Units"],
    services: ["Installation", "AMC Services"],
    quantity: 75
  },
  {
    companyName: "NextGen Mobiles",
    address: "3rd Floor, Megamall, Mumbai, Maharashtra",
    email: "info@nextgenmobiles.in",
    contact: "9988776655",
    products: ["Smartphones", "Tablets"],
    services: ["Customer Support", "Screen Replacement"],
    quantity: 150
  },
  {
    companyName: "SecureNet Systems",
    address: "A-55, Tech Enclave, Noida, Uttar Pradesh",
    email: "contact@securenet.com",
    contact: "9123098765",
    products: ["Firewall Appliances", "VPN Routers"],
    services: ["Network Security", "IT Audits"],
    quantity: 30
  },
  {
    companyName: "Royal Furniture Mart",
    address: "Main Market, Ludhiana, Punjab",
    email: "sales@royalfurnitures.com",
    contact: "9955667788",
    products: ["Wooden Sofa", "Dining Tables"],
    services: ["Custom Design", "Home Delivery"],
    quantity: 85
  },
  {
    companyName: "SolarShine Energy",
    address: "Near Solar Park, Jaipur, Rajasthan",
    email: "contact@solarshine.in",
    contact: "9012341234",
    products: ["Solar Panels", "Batteries"],
    services: ["Installation", "Maintenance"],
    quantity: 220
  },
  {
    companyName: "FreshBox Retail",
    address: "Market Street, Kochi, Kerala",
    email: "info@freshboxretail.com",
    contact: "9876540987",
    products: ["Packaged Vegetables", "Frozen Fruits"],
    services: ["Cold Chain Supply"],
    quantity: 500
  },
  {
    companyName: "BuildRight Constructions",
    address: "Civil Lines, Kanpur, Uttar Pradesh",
    email: "buildright@construction.in",
    contact: "9090909090",
    products: ["Cement", "Steel Bars"],
    services: ["Building Contracts", "Interior Designing"],
    quantity: 300
  },
  {
    companyName: "Urban Wear Co.",
    address: "Fashion Plaza, Ahmedabad, Gujarat",
    email: "sales@urbanwearco.com",
    contact: "9871234567",
    products: ["T-Shirts", "Denim Jeans"],
    services: ["Retailing", "Custom Printing"],
    quantity: 600
  },
  {
    companyName: "Medico Plus Pharma",
    address: "Sector 22, Chandigarh",
    email: "contact@medicoplus.com",
    contact: "9988772233",
    products: ["Antibiotics", "Painkillers"],
    services: ["Distribution", "Home Delivery"],
    quantity: 450
  },
  {
    companyName: "FinEdge Financials",
    address: "Downtown Towers, Kolkata, West Bengal",
    email: "support@finedge.com",
    contact: "9832123456",
    products: ["Mutual Funds", "Insurance"],
    services: ["Wealth Management", "Loan Assistance"],
    quantity: 90
  },
  {
    companyName: "Bright Minds Academy",
    address: "Education Hub, Indore, Madhya Pradesh",
    email: "info@brightminds.edu",
    contact: "9711123456",
    products: ["Study Material", "Online Courses"],
    services: ["Coaching", "Career Counseling"],
    quantity: 350
  },
  {
    companyName: "AutoSpark Spares",
    address: "Sector 12, Gurgaon, Haryana",
    email: "orders@autospark.com",
    contact: "9900887766",
    products: ["Brake Pads", "Engine Oil"],
    services: ["Garage Support", "Vehicle Diagnostics"],
    quantity: 250
  },
  {
    companyName: "BakeHouse Delights",
    address: "Market Road, Bhopal, Madhya Pradesh",
    email: "orders@bakehouse.in",
    contact: "9887766554",
    products: ["Cakes", "Cookies"],
    services: ["Event Catering", "Online Delivery"],
    quantity: 180
  },
  {
    companyName: "TrekZone Gears",
    address: "Himalaya Road, Dehradun, Uttarakhand",
    email: "sales@trekzone.com",
    contact: "9776655443",
    products: ["Trekking Bags", "Climbing Gear"],
    services: ["Adventure Tours", "Rentals"],
    quantity: 140
  },
  {
    companyName: "PrintHub Solutions",
    address: "IT Park, Mohali, Punjab",
    email: "hello@printhub.in",
    contact: "9765432100",
    products: ["Business Cards", "Posters"],
    services: ["Offset Printing", "Digital Printing"],
    quantity: 110
  },
  {
    companyName: "EcoNest Interiors",
    address: "Interior Lane, Bhubaneswar, Odisha",
    email: "contact@econestinteriors.com",
    contact: "9654321987",
    products: ["Modular Kitchen", "Wardrobes"],
    services: ["Interior Design", "3D Rendering"],
    quantity: 65
  }
];

async function seed() {
  try {
    // Clear existing data
    await db.delete(companies);
    await db.delete(facebookData);

    // Insert demo companies
    for (const company of demoCompanies) {
      await db.insert(companies).values(company);
    }

    // Insert Facebook data
    for (const data of facebookDataSeed) {
      await db.insert(facebookData).values(data);
    }

    console.log("✅ Seed data inserted successfully");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Run the seed function
seed(); 