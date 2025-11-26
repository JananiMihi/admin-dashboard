# Mission Customization Architecture

## Overview

This document describes the Mission Customization System that allows educators to customize missions per class without affecting the main platform missions created by SuperAdmin.

## Architecture Design

### Core Principle
**Original missions are never modified.** Instead, customizations are stored separately and merged at query time.

### Three-Tier Mission System

1. **Global Missions (SuperAdmin)**
   - Created by SuperAdmin
   - `is_global = true`, `created_by = NULL`, `org_id = NULL`
   - Available to all educators
   - Can be customized per class

2. **Organization Missions (Educator)**
   - Created by educators
   - `is_global = false`, `created_by = educator_user_id`, `org_id = educator_org_id`
   - Only visible to educators in the same organization
   - Can be customized per class

3. **Class Customizations**
   - Overrides stored in `class_mission_customizations` table
   - Only fields that differ from base mission are stored
   - Merged with base mission when displayed to students

## Database Schema

### Missions Table Updates

```sql
-- Added columns:
created_by UUID        -- Who created the mission (NULL = SuperAdmin)
org_id UUID           -- Organization ID (NULL = global)
is_global BOOLEAN     -- true = SuperAdmin mission, false = Educator mission
```

### New Tables

#### 1. `class_missions`
Links missions to classes (which missions are assigned to which classes).

```sql
class_id UUID      -- The class
mission_id UUID    -- The mission
assigned_by UUID   -- Who assigned it
display_order INT  -- Order in this class
is_active BOOLEAN  -- Can be disabled without removing
```

#### 2. `class_mission_customizations`
Stores class-specific customizations. Only non-NULL fields override the base mission.

```sql
class_id UUID
mission_id UUID
custom_title TEXT              -- NULL = use base title
custom_description TEXT         -- NULL = use base description
custom_order INTEGER           -- NULL = use base order
custom_xp_reward INTEGER       -- NULL = use base xp_reward
custom_unlocked BOOLEAN        -- NULL = use base unlocked
custom_difficulty TEXT         -- NULL = use base difficulty
custom_estimated_time INTEGER  -- NULL = use base estimated_time
custom_mission_data JSONB      -- NULL = use base mission_data
```

### Helper Function

**`get_customized_mission(class_id, mission_id)`**
- Returns JSON with merged mission data
- Base mission values are used unless customization exists
- Automatically handles NULL values in customizations

## Workflow

### 1. SuperAdmin Creates Global Mission

```sql
INSERT INTO missions (
  title, description, mission_data, 
  is_global, created_by, org_id
) VALUES (
  'Introduction to Variables',
  'Learn basic variable concepts',
  '{"steps": [...]}',
  true,  -- Global mission
  NULL,  -- SuperAdmin created
  NULL   -- No org restriction
);
```

### 2. Educator Views Available Missions

**Educators see:**
- All global missions (`is_global = true`)
- Missions created by their organization (`org_id = educator_org_id`)

**API Endpoint:**
```
GET /api/educator/missions/available
```

### 3. Educator Creates Their Own Mission

```sql
INSERT INTO missions (
  title, description, mission_data,
  is_global, created_by, org_id
) VALUES (
  'Advanced Python Concepts',
  'Custom mission for my class',
  '{"steps": [...]}',
  false,           -- Educator mission
  educator_user_id,
  educator_org_id
);
```

**API Endpoint:**
```
POST /api/educator/missions/create
```

### 4. Educator Assigns Mission to Class

```sql
INSERT INTO class_missions (class_id, mission_id, display_order)
VALUES (class_uuid, mission_uuid, 1);
```

**API Endpoint:**
```
POST /api/educator/classes/{class_id}/missions
Body: { mission_id: "uuid" }
```

### 5. Educator Customizes Mission for Class

**Example: Change XP reward for this class**

```sql
INSERT INTO class_mission_customizations (
  class_id, mission_id,
  custom_xp_reward  -- Only this field is customized
) VALUES (
  class_uuid, mission_uuid,
  150  -- Increased from base 100
)
ON CONFLICT (class_id, mission_id) 
DO UPDATE SET custom_xp_reward = 150;
```

**API Endpoint:**
```
PUT /api/educator/classes/{class_id}/missions/{mission_id}/customize
Body: {
  custom_xp_reward: 150,
  custom_description: "Modified for beginners"
}
```

### 6. Students See Customized Mission

When students access a mission, the system:
1. Fetches base mission from `missions` table
2. Fetches customizations from `class_mission_customizations`
3. Merges: uses custom values when available, base values otherwise

**API Endpoint (for students):**
```
GET /api/classes/{class_id}/missions/{mission_id}
```

## API Endpoints

### For Educators

#### Get Available Missions
```
GET /api/educator/missions/available
Returns: List of global missions + educator's org missions
```

#### Create Educator Mission
```
POST /api/educator/missions/create
Body: { title, description, mission_data, ... }
Creates: Mission with is_global=false, org_id=educator_org
```

#### Assign Mission to Class
```
POST /api/educator/classes/{class_id}/missions
Body: { mission_id, display_order? }
Links: Mission to class in class_missions table
```

#### Customize Mission for Class
```
PUT /api/educator/classes/{class_id}/missions/{mission_id}/customize
Body: { 
  custom_title?, custom_description?, custom_xp_reward?, 
  custom_mission_data?, ... 
}
Stores: Only provided fields in customizations table
```

#### Get Class Missions (with customizations merged)
```
GET /api/educator/classes/{class_id}/missions
Returns: Missions with customizations already merged
```

#### Remove Customization (revert to base)
```
DELETE /api/educator/classes/{class_id}/missions/{mission_id}/customize?field=xp_reward
Removes: Specific field customization (sets to NULL)
```

### For Students

#### Get Mission (merged with customizations)
```
GET /api/classes/{class_id}/missions/{mission_id}
Returns: Merged mission data (base + customizations)
```

## Benefits

1. **Original Missions Protected**: Base missions are never modified
2. **Flexible Customization**: Per-field customization (only change what you need)
3. **Multi-Class Support**: Same mission can have different customizations per class
4. **Easy Reversion**: Delete customization to revert to base mission
5. **Clear Ownership**: Tracks who created each mission
6. **Isolation**: Educator missions are isolated to their organization

## Example Use Cases

### Use Case 1: Adjust Difficulty
Educator assigns a global mission but wants to make it easier for their class.
- Assign mission to class
- Customize: Set `custom_difficulty = 'easy'` and `custom_xp_reward = 200`
- Students see easier version with more XP

### Use Case 2: Modify Content
Educator wants to change some steps in a mission for their class.
- Assign mission to class
- Customize: Set `custom_mission_data` with modified steps
- Original mission remains unchanged

### Use Case 3: Organization-Specific Mission
Educator creates a mission specific to their organization's curriculum.
- Create mission with `is_global = false`, `org_id = their_org`
- Mission is only visible to educators in same org
- Can still be customized per class

## Migration Steps

1. Run `database/migrations/009_mission_customization.sql`
2. Update existing missions to be global (already in migration)
3. Implement API endpoints (see implementation guide)
4. Update frontend to use new endpoints

## Security Considerations

- Row Level Security (RLS) ensures:
  - Educators can only customize missions for their org's classes
  - Educators can only see global missions + their org's missions
  - Students can only see missions assigned to their classes
  - SuperAdmin has full access to everything

## Future Enhancements

- Mission templates (base missions that can be cloned)
- Mission versioning (track changes to base missions)
- Bulk customization (customize multiple missions at once)
- Customization history (audit trail of customizations)










