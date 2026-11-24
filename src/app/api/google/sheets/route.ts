import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createSpreadsheet,
  shareSpreadsheetWithRecipients,
  testSheetsConnection,
  retryFailedSync,
  processSyncQueue,
  syncResultsToSheets,
} from '@/lib/google-sheets';
import { serverStore } from '@/lib/server-store';
import { GoogleSheetsRecipient } from '@/types';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 });
  }

  const config = serverStore.getSheetsConfig();
  const stats = serverStore.getSyncStats();
  const queue = serverStore.getSyncQueue().slice(0, 50);

  return NextResponse.json({
    success: true,
    config,
    stats,
    queue,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_spreadsheet') {
      const res = await createSpreadsheet();
      serverStore.logAuditAction(session.userId, 'admin', 'CREATE_SPREADSHEET', 'google_sheets', res.spreadsheet_id);
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'test_connection') {
      const res = await testSheetsConnection();
      return NextResponse.json(res);
    }

    if (action === 'retry_sync') {
      const res = await retryFailedSync();
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'process_queue') {
      const res = await processSyncQueue();
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'sync_results') {
      const res = await syncResultsToSheets();
      return NextResponse.json(res);
    }

    if (action === 'update_recipients') {
      const recipients: GoogleSheetsRecipient[] = body.recipients || [];
      const config = serverStore.getSheetsConfig();
      serverStore.updateSheetsConfig({ recipients });

      if (config.spreadsheet_id && body.trigger_share) {
        const updated = await shareSpreadsheetWithRecipients(config.spreadsheet_id, recipients);
        serverStore.updateSheetsConfig({ recipients: updated });
        return NextResponse.json({ success: true, recipients: updated });
      }

      return NextResponse.json({ success: true, recipients });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Operation failed' }, { status: 500 });
  }
}
