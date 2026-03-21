import { describe, it, expect, vi } from 'vitest';
import { registerDriveListShared } from './drive-list-shared.js';
import { createMockDrive, captureToolHandler } from './test-helpers.js';

describe('drive_list_shared_drives', () => {
  it('lists shared drives with pagination', async () => {
    const drive = createMockDrive({
      drivesList: vi.fn().mockResolvedValue({
        data: {
          drives: [
            { id: 'sd-1', name: 'Engineering', createdTime: '2026-01-01T00:00:00Z' },
            { id: 'sd-2', name: 'Marketing', createdTime: '2026-02-01T00:00:00Z' },
          ],
          nextPageToken: 'next-abc',
        },
      }),
    });

    const handler = captureToolHandler(registerDriveListShared, drive);
    const result = await handler({ page_size: 20 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.drives).toHaveLength(2);
    expect(parsed.drives[0].id).toBe('sd-1');
    expect(parsed.drives[0].name).toBe('Engineering');
    expect(parsed.drives[1].id).toBe('sd-2');
    expect(parsed.has_more).toBe(true);
    expect(parsed.next_page_token).toBe('next-abc');

    expect(drive.drives.list).toHaveBeenCalledWith({
      pageSize: 20,
      pageToken: undefined,
    });
  });

  it('passes page_token for pagination', async () => {
    const drive = createMockDrive({
      drivesList: vi.fn().mockResolvedValue({
        data: { drives: [], nextPageToken: null },
      }),
    });

    const handler = captureToolHandler(registerDriveListShared, drive);
    const result = await handler({ page_size: 10, page_token: 'prev-token' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.drives).toHaveLength(0);
    expect(parsed.has_more).toBe(false);

    expect(drive.drives.list).toHaveBeenCalledWith({
      pageSize: 10,
      pageToken: 'prev-token',
    });
  });

  it('returns error on API failure', async () => {
    const drive = createMockDrive({
      drivesList: vi.fn().mockRejectedValue(new Error('List failed')),
    });

    const handler = captureToolHandler(registerDriveListShared, drive);
    const result = await handler({ page_size: 20 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('List failed');
  });
});
