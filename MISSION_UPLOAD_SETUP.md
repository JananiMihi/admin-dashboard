# Mission Upload to Supabase - Setup Guide

## Overview

Your admin dashboard now supports uploading complete mission JSON files directly to Supabase without manually logging into Supabase. The system handles:
- ✅ Full mission JSON uploads (from Mission Generator)
- ✅ Image uploads to Supabase Storage
- ✅ Automatic metadata extraction
- ✅ Direct database insertion using admin credentials

## Step 1: Update Database Schema

To store the full mission JSON data, add a `mission_data` JSONB column to your `missions` table:

```sql
-- Add mission_data column to store full JSON
ALTER TABLE missions 
ADD COLUMN mission_data JSONB;

-- Optional: Add index for better query performance
CREATE INDEX idx_missions_mission_data ON missions USING GIN (mission_data);
```

### Alternative: If you prefer not to add a column

The system will automatically store the JSON file in the Supabase Storage bucket (`missions` bucket) if the `mission_data` column doesn't exist. However, storing it as JSONB in the database is recommended for easier querying.

## Step 2: Set Up Storage Bucket

The upload system automatically creates a `missions` bucket if it doesn't exist. However, you can manually create and configure it:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `missions`
3. Set it to **Public** (for public image access)
4. Configure policies if needed

### Storage Bucket Policies

```sql
-- Allow public read access to mission images
CREATE POLICY "Public Access for Mission Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'missions');

-- Allow service role to upload/update
-- (Already handled by service_role_key)
```

## Step 3: Usage

### Upload Full Mission JSON

1. Go to **Dashboard → Missions**
2. Click **Upload JSON** button
3. Select your mission JSON file (from Mission Generator)
4. (Optional) Select images referenced in the JSON
5. Click **Upload to Supabase**

### What Gets Uploaded

- **Mission Metadata**: Title, description, XP reward, difficulty, etc. → `missions` table
- **Full Mission JSON**: Complete mission structure → `mission_data` JSONB column (or storage)
- **Images**: All uploaded images → `missions/images/` in storage bucket

### Supported JSON Formats

#### Full Mission Format (from Mission Generator)
```json
{
  "version": 1,
  "layout": "BlocklySplitLayout",
  "title": "Keyboard Pilot",
  "description": "Learn keyboard controls",
  "mission_time": "30",
  "Difficulty": 3,
  "steps": [...],
  "resources": [...]
}
```

#### Simple Array Format (legacy)
```json
[
  {
    "title": "Mission Title",
    "description": "Description",
    "order": 1,
    "xp_reward": 100
  }
]
```

## How It Works

1. **Frontend** (`app/dashboard/missions/page.tsx`):
   - Upload form handles JSON file and images
   - Sends FormData to API route

2. **API Route** (`app/api/missions/upload/route.ts`):
   - Receives JSON file and images
   - Parses mission JSON
   - Extracts metadata (title, description, etc.)
   - Uploads images to Supabase Storage
   - Stores metadata in `missions` table
   - Stores full JSON in `mission_data` column (or storage fallback)
   - Uses `supabaseAdmin` client (no manual login needed)

3. **Storage**:
   - Images: `missions/images/{timestamp}_{filename}`
   - JSON fallback: `missions/json/{timestamp}_{title}_mission.json`

## API Response

```json
{
  "success": true,
  "mission": {
    "id": "uuid",
    "title": "Mission Title",
    "mission_data": {...}
  },
  "message": "Mission uploaded successfully",
  "images": ["https://...", "https://..."],
  "imagePaths": {
    "image1.png": "https://..."
  }
}
```

## Troubleshooting

### Error: "column mission_data does not exist"
- Solution: Run the SQL migration above to add the column

### Error: "Bucket not found"
- Solution: The system will auto-create it, or manually create `missions` bucket in Storage

### Images not uploading
- Check: Supabase Storage bucket permissions
- Check: File size limits (default: 5MB)
- Check: Allowed MIME types

### JSON too large
- If JSON is very large, it will be stored in storage bucket instead of JSONB column
- This is automatic fallback behavior

## Example Workflow

1. **Create Mission** in Mission Generator (`/dashboard/mission-generator`)
2. **Download JSON** from the generator
3. **Prepare Images** that are referenced in the JSON
4. **Upload Both** in Missions page (`/dashboard/missions`)
5. **Done!** Mission is now in Supabase database and images in storage

No need to manually log into Supabase anymore! 🎉


