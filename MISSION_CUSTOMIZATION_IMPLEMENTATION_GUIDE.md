# Mission Customization Implementation Guide

## Quick Start

### Step 1: Run Database Migration

Run the migration file in Supabase SQL Editor:

```bash
database/migrations/009_mission_customization.sql
```

This will:
- Add `created_by`, `org_id`, `is_global` columns to `missions` table
- Create `class_missions` table (if not exists)
- Create `class_mission_customizations` table
- Create helper function `get_customized_mission()`
- Set up RLS policies

### Step 2: Test API Endpoints

All API endpoints are ready. Test them:

#### Get Available Missions (Educator)
```bash
GET /api/educator/missions/available
Authorization: Bearer <educator_token>
```

#### Create Educator Mission
```bash
POST /api/educator/missions/create
Authorization: Bearer <educator_token>
Body: {
  "title": "My Custom Mission",
  "description": "Mission for my class",
  "mission_data": {...},
  "xp_reward": 100
}
```

#### Assign Mission to Class
```bash
POST /api/educator/classes/{class_id}/missions
Authorization: Bearer <educator_token>
Body: {
  "mission_id": "uuid"
}
```

#### Customize Mission for Class
```bash
PUT /api/educator/classes/{class_id}/missions/{mission_id}/customize
Authorization: Bearer <educator_token>
Body: {
  "custom_xp_reward": 150,
  "custom_description": "Modified for beginners",
  "custom_difficulty": "easy"
}
```

#### Get Class Missions (with customizations)
```bash
GET /api/educator/classes/{class_id}/missions
Authorization: Bearer <educator_token>
```

### Step 3: Update Frontend (Optional)

Update your educator missions page to:
1. Show available missions (global + org missions)
2. Allow creating new missions
3. Show customization options for each assigned mission
4. Display merged missions (base + customizations)

## Architecture Overview

### Mission Types

1. **Global Missions** (`is_global = true`)
   - Created by SuperAdmin
   - `created_by = NULL`, `org_id = NULL`
   - Visible to all educators

2. **Organization Missions** (`is_global = false`)
   - Created by educators
   - `created_by = educator_user_id`, `org_id = educator_org_id`
   - Only visible to educators in same organization

### Customization Flow

1. **Assign Mission** → Insert into `class_missions`
2. **Customize Mission** → Insert/Update in `class_mission_customizations`
3. **Display Mission** → Merge base mission with customizations

### Merging Logic

When displaying a mission to students:
```javascript
const mergedMission = {
  title: customization?.custom_title ?? baseMission.title,
  xp_reward: customization?.custom_xp_reward ?? baseMission.xp_reward,
  // ... etc
}
```

## API Reference

### Educator Endpoints

#### `GET /api/educator/missions/available`
Get missions available to educator (global + org missions)

**Response:**
```json
{
  "success": true,
  "missions": [...],
  "count": 5
}
```

#### `POST /api/educator/missions/create`
Create a new mission as educator

**Request Body:**
```json
{
  "title": "Mission Title",
  "description": "Description",
  "mission_data": {...},
  "xp_reward": 100,
  "difficulty": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "mission": {...},
  "message": "Mission created successfully"
}
```

#### `POST /api/educator/classes/{class_id}/missions`
Assign mission to class

**Request Body:**
```json
{
  "mission_id": "uuid"
}
```

#### `PUT /api/educator/classes/{class_id}/missions/{mission_id}/customize`
Customize mission for class

**Request Body:**
```json
{
  "custom_title": "Custom Title",
  "custom_xp_reward": 150,
  "custom_difficulty": "easy",
  "custom_mission_data": {...}
}
```

**Note:** Only include fields you want to customize. Omitted fields remain as base values.

#### `GET /api/educator/classes/{class_id}/missions/{mission_id}/customize`
Get customization for a mission in a class

#### `DELETE /api/educator/classes/{class_id}/missions/{mission_id}/customize`
Remove customization (revert to base mission)

**Query Parameters:**
- `?field=xp_reward` - Remove specific field only
- No parameter - Remove entire customization

#### `GET /api/educator/classes/{class_id}/missions`
Get all missions for class (with customizations merged)

**Response:**
```json
{
  "success": true,
  "missions": [
    {
      "id": "...",
      "title": "Custom Title",  // Merged with customization
      "xp_reward": 150,          // Merged with customization
      "has_customization": true,
      "customized_at": "..."
    }
  ]
}
```

### Student Endpoints

#### `GET /api/classes/{class_id}/missions/{mission_id}`
Get mission for student (with customizations merged)

**Response:**
```json
{
  "success": true,
  "mission": {
    "id": "...",
    "title": "Custom Title",
    "xp_reward": 150,
    "has_customization": true
  }
}
```

## Examples

### Example 1: Adjust XP Reward

```javascript
// Assign mission
await fetch(`/api/educator/classes/${classId}/missions`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ mission_id: missionId })
})

// Customize XP reward
await fetch(`/api/educator/classes/${classId}/missions/${missionId}/customize`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    custom_xp_reward: 200  // Increase from base 100
  })
})
```

### Example 2: Modify Mission Content

```javascript
// Customize mission_data
await fetch(`/api/educator/classes/${classId}/missions/${missionId}/customize`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    custom_mission_data: {
      ...baseMission.mission_data,
      steps: modifiedSteps  // Custom steps for this class
    }
  })
})
```

### Example 3: Remove Customization

```javascript
// Remove specific field
await fetch(`/api/educator/classes/${classId}/missions/${missionId}/customize?field=xp_reward`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
})

// Remove all customizations
await fetch(`/api/educator/classes/${classId}/missions/${missionId}/customize`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## Security

All endpoints enforce:
- Authentication required
- Role-based access (Educator/SuperAdmin)
- Organization isolation (educators can only access their org's classes)
- Row Level Security (RLS) at database level

## Database Functions

### `get_customized_mission(class_id, mission_id)`

SQL function that merges base mission with customizations.

**Usage:**
```sql
SELECT * FROM get_customized_mission('class-uuid', 'mission-uuid');
```

**Returns:** JSON with merged mission data

## Troubleshooting

### Mission not appearing for educator
- Check if mission `is_global = true` OR `org_id = educator_org_id`
- Verify educator's `org_id` is set correctly

### Customization not showing
- Verify mission is assigned to class (exists in `class_missions`)
- Check `class_mission_customizations` table has entry
- Ensure API is merging customizations correctly

### Cannot create mission as educator
- Verify educator has `role = 'Educator'`
- Verify educator has `org_id` set
- Check RLS policies are correctly set up

## Next Steps

1. **Frontend Integration**
   - Update mission selection UI to show global vs org missions
   - Add customization UI in class mission management
   - Show customization indicators

2. **Advanced Features**
   - Bulk customization
   - Customization templates
   - Mission cloning
   - Customization history/audit







