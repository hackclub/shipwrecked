import { NextResponse } from 'next/server';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  image?: string;
  price: number;
  config?: {
    progress_per_hour?: number;
    dollars_per_hour?: number;
  };
}

function getShopItems(): ShopItem[] {
  const filePath = path.join(process.cwd(), 'app/bay/shop-items.yaml');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(fileContents) as { items: ShopItem[] };
  return data.items || [];
}

export async function GET() {
  const session = await getServerSession(opts);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = getShopItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error loading shop items:', error);
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 });
  }
} 