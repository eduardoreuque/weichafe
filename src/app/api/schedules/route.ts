import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SCHEDULES_FILE = join(process.cwd(), "public", "schedules.json");

export async function GET() {
  try {
    const data = readFileSync(SCHEDULES_FILE, "utf-8");
    const schedules = JSON.parse(data);
    return NextResponse.json(schedules.schedules);
  } catch (error) {
    console.error("Error reading schedules:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, schedule } = body;

    const data = readFileSync(SCHEDULES_FILE, "utf-8");
    const schedulesData = JSON.parse(data);
    let schedules = schedulesData.schedules;

    if (action === "create") {
      const newSchedule = {
        ...schedule,
        id: schedule.id || `${schedule.discipline.toLowerCase()}-${Date.now()}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      schedules.push(newSchedule);
    } else if (action === "update") {
      const index = schedules.findIndex((s: any) => s.id === schedule.id);
      if (index !== -1) {
        schedules[index] = {
          ...schedules[index],
          ...schedule,
          updatedAt: new Date().toISOString(),
        };
      }
    } else if (action === "delete") {
      schedules = schedules.filter((s: any) => s.id !== schedule.id);
    }

    writeFileSync(SCHEDULES_FILE, JSON.stringify({ schedules }, null, 2));
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error("Error updating schedules:", error);
    return NextResponse.json({ success: false, error: "Error al guardar" }, { status: 500 });
  }
}