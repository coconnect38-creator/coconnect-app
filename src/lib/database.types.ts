export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ad_placements": {
                  Row: {
                    "category_id": number | null,"clicks": number,"created_at": string,"district_id": number | null,"ends_on": string,"id": string,"image_path": string,"impressions": number,"is_active": boolean,"slot": string,"starts_on": string,"target_url": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"clicks"?: number,"created_at"?: string,"district_id"?: number | null,"ends_on": string,"id"?: string,"image_path": string,"impressions"?: number,"is_active"?: boolean,"slot": string,"starts_on": string,"target_url": string,"title": string
                  }
                  Update: {
                    "category_id"?: number | null,"clicks"?: number,"created_at"?: string,"district_id"?: number | null,"ends_on"?: string,"id"?: string,"image_path"?: string,"impressions"?: number,"is_active"?: boolean,"slot"?: string,"starts_on"?: string,"target_url"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ad_placements_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ad_placements_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_actions": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"meta": Json | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: number,"meta"?: Json | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: number,"meta"?: Json | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admin_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "app_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"awards": {
                  Row: {
                    "awarded_at": string,"bid_id": string,"cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"completed_at": string | null,"completion_requested_at": string | null,"completion_requested_by": string | null,"id": string,"job_id": string,"publisher_id": string,"worker_id": string,"workers_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "awarded_at"?: string,"bid_id": string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"completion_requested_at"?: string | null,"completion_requested_by"?: string | null,"id"?: string,"job_id": string,"publisher_id": string,"worker_id": string,"workers_count"?: number
                  }
                  Update: {
                    "awarded_at"?: string,"bid_id"?: string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"completion_requested_at"?: string | null,"completion_requested_by"?: string | null,"id"?: string,"job_id"?: string,"publisher_id"?: string,"worker_id"?: string,"workers_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "awards_bid_id_fkey"
      columns: ["bid_id"]
isOneToOne: true
      referencedRelation: "bids"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_completion_requested_by_fkey"
      columns: ["completion_requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_completion_requested_by_fkey"
      columns: ["completion_requested_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_publisher_id_fkey"
      columns: ["publisher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_publisher_id_fkey"
      columns: ["publisher_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "awards_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bids": {
                  Row: {
                    "auto_rejected": boolean,"bidder_id": string,"can_start_on": string | null,"created_at": string,"days_offered": number | null,"id": string,"job_id": string,"message": string | null,"rate": number,"rate_unit": Database["public"]['Enums']["rate_unit"],"status": Database["public"]['Enums']["bid_status"],"total_amount": number | null,"updated_at": string,"workers_offered": number
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_rejected"?: boolean,"bidder_id": string,"can_start_on"?: string | null,"created_at"?: string,"days_offered"?: number | null,"id"?: string,"job_id": string,"message"?: string | null,"rate": number,"rate_unit": Database["public"]['Enums']["rate_unit"],"status"?: Database["public"]['Enums']["bid_status"],"total_amount"?: never,"updated_at"?: string,"workers_offered"?: number
                  }
                  Update: {
                    "auto_rejected"?: boolean,"bidder_id"?: string,"can_start_on"?: string | null,"created_at"?: string,"days_offered"?: number | null,"id"?: string,"job_id"?: string,"message"?: string | null,"rate"?: number,"rate_unit"?: Database["public"]['Enums']["rate_unit"],"status"?: Database["public"]['Enums']["bid_status"],"total_amount"?: never,"updated_at"?: string,"workers_offered"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bids_bidder_id_fkey"
      columns: ["bidder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_bidder_id_fkey"
      columns: ["bidder_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bids_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "default_rate_unit": Database["public"]['Enums']["rate_unit"],"icon": string | null,"id": number,"is_active": boolean,"name_en": string,"name_si": string,"name_ta": string,"parent_id": number | null,"publish_fee_lkr": number,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "default_rate_unit"?: Database["public"]['Enums']["rate_unit"],"icon"?: string | null,"id"?: number,"is_active"?: boolean,"name_en": string,"name_si": string,"name_ta": string,"parent_id"?: number | null,"publish_fee_lkr"?: number,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "default_rate_unit"?: Database["public"]['Enums']["rate_unit"],"icon"?: string | null,"id"?: number,"is_active"?: boolean,"name_en"?: string,"name_si"?: string,"name_ta"?: string,"parent_id"?: number | null,"publish_fee_lkr"?: number,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "district_id": number,"id": number,"lat": number | null,"lng": number | null,"name_en": string,"name_si": string | null,"name_ta": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "district_id": number,"id"?: number,"lat"?: number | null,"lng"?: number | null,"name_en": string,"name_si"?: string | null,"name_ta"?: string | null
                  }
                  Update: {
                    "district_id"?: number,"id"?: number,"lat"?: number | null,"lng"?: number | null,"name_en"?: string,"name_si"?: string | null,"name_ta"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cities_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_lookup_failures": {
                  Row: {
                    "created_at": string,"id": number,"job_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"job_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"job_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"districts": {
                  Row: {
                    "id": number,"name_en": string,"name_si": string,"name_ta": string,"province": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"name_en": string,"name_si": string,"name_ta": string,"province": string,"slug": string
                  }
                  Update: {
                    "id"?: number,"name_en"?: string,"name_si"?: string,"name_ta"?: string,"province"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"job_images": {
                  Row: {
                    "created_at": string,"id": string,"job_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"job_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"job_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_images_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"job_threads": {
                  Row: {
                    "author_id": string,"body": string,"contact_flags": (string)[],"created_at": string,"id": string,"is_hidden": boolean,"job_id": string,"kind": Database["public"]['Enums']["thread_kind"],"parent_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"contact_flags"?: (string)[],"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"job_id": string,"kind": Database["public"]['Enums']["thread_kind"],"parent_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"contact_flags"?: (string)[],"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"job_id"?: string,"kind"?: Database["public"]['Enums']["thread_kind"],"parent_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_threads_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_threads_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_threads_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "job_threads"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "address_hint": string | null,"bid_count": number,"cancel_reason": string | null,"category_id": number,"city": string | null,"contact_flags": (string)[],"created_at": string,"days_needed": number | null,"description": string,"district_id": number,"expires_at": string | null,"expiry_warned_at": string | null,"hiring_closed_at": string | null,"id": string,"is_date_flexible": boolean,"is_featured": boolean,"lat": number | null,"lng": number | null,"lowest_rate": number | null,"payment_ref": string | null,"published_at": string | null,"publisher_id": string,"rate_unit": Database["public"]['Enums']["rate_unit"],"reject_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"search_text": string | null,"start_date": string | null,"status": Database["public"]['Enums']["job_status"],"submitted_at": string | null,"suggested_rate": number,"title": string,"updated_at": string,"views_count": number,"workers_needed": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_hint"?: string | null,"bid_count"?: number,"cancel_reason"?: string | null,"category_id": number,"city"?: string | null,"contact_flags"?: (string)[],"created_at"?: string,"days_needed"?: number | null,"description": string,"district_id": number,"expires_at"?: string | null,"expiry_warned_at"?: string | null,"hiring_closed_at"?: string | null,"id"?: string,"is_date_flexible"?: boolean,"is_featured"?: boolean,"lat"?: number | null,"lng"?: number | null,"lowest_rate"?: number | null,"payment_ref"?: string | null,"published_at"?: string | null,"publisher_id": string,"rate_unit"?: Database["public"]['Enums']["rate_unit"],"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: never,"start_date"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"submitted_at"?: string | null,"suggested_rate": number,"title": string,"updated_at"?: string,"views_count"?: number,"workers_needed"?: number | null
                  }
                  Update: {
                    "address_hint"?: string | null,"bid_count"?: number,"cancel_reason"?: string | null,"category_id"?: number,"city"?: string | null,"contact_flags"?: (string)[],"created_at"?: string,"days_needed"?: number | null,"description"?: string,"district_id"?: number,"expires_at"?: string | null,"expiry_warned_at"?: string | null,"hiring_closed_at"?: string | null,"id"?: string,"is_date_flexible"?: boolean,"is_featured"?: boolean,"lat"?: number | null,"lng"?: number | null,"lowest_rate"?: number | null,"payment_ref"?: string | null,"published_at"?: string | null,"publisher_id"?: string,"rate_unit"?: Database["public"]['Enums']["rate_unit"],"reject_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"search_text"?: never,"start_date"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"submitted_at"?: string | null,"suggested_rate"?: number,"title"?: string,"updated_at"?: string,"views_count"?: number,"workers_needed"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_publisher_id_fkey"
      columns: ["publisher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_publisher_id_fkey"
      columns: ["publisher_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"emailed_at": string | null,"id": string,"link": string | null,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_lkr": number,"bank_ref": string | null,"created_at": string,"gateway_ref": string | null,"id": string,"job_id": string | null,"method": Database["public"]['Enums']["payment_method"],"reference": string | null,"reject_reason": string | null,"slip_path": string | null,"status": Database["public"]['Enums']["payment_status"],"user_id": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_lkr": number,"bank_ref"?: string | null,"created_at"?: string,"gateway_ref"?: string | null,"id"?: string,"job_id"?: string | null,"method": Database["public"]['Enums']["payment_method"],"reference"?: string | null,"reject_reason"?: string | null,"slip_path"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"user_id": string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "amount_lkr"?: number,"bank_ref"?: string | null,"created_at"?: string,"gateway_ref"?: string | null,"id"?: string,"job_id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"],"reference"?: string | null,"reject_reason"?: string | null,"slip_path"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"user_id"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"broker_verified": boolean,"city": string | null,"created_at": string,"crew_size": number | null,"district_id": number | null,"full_name": string,"id": string,"is_broker": boolean,"is_suspended": boolean,"jobs_completed": number,"lat": number | null,"lng": number | null,"phone": string | null,"phone_verified": boolean,"preferred_lang": string,"rating_avg": number,"rating_count": number,"suspended_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"broker_verified"?: boolean,"city"?: string | null,"created_at"?: string,"crew_size"?: number | null,"district_id"?: number | null,"full_name": string,"id": string,"is_broker"?: boolean,"is_suspended"?: boolean,"jobs_completed"?: number,"lat"?: number | null,"lng"?: number | null,"phone"?: string | null,"phone_verified"?: boolean,"preferred_lang"?: string,"rating_avg"?: number,"rating_count"?: number,"suspended_reason"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"broker_verified"?: boolean,"city"?: string | null,"created_at"?: string,"crew_size"?: number | null,"district_id"?: number | null,"full_name"?: string,"id"?: string,"is_broker"?: boolean,"is_suspended"?: boolean,"jobs_completed"?: number,"lat"?: number | null,"lng"?: number | null,"phone"?: string | null,"phone_verified"?: boolean,"preferred_lang"?: string,"rating_avg"?: number,"rating_count"?: number,"suspended_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: number,"user_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_limits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rate_limits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"is_hidden": boolean,"job_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"job_id": string,"rating": number,"reviewee_id": string,"reviewer_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"job_id"?: string,"rating"?: number,"reviewee_id"?: string,"reviewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_id_fkey"
      columns: ["reviewee_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"broker_verified": boolean,"city": string | null,"created_at": string,"crew_size": number | null,"district_id": number | null,"full_name": string,"id": string,"is_broker": boolean,"jobs_completed": number,"rating_avg": number,"rating_count": number
                  }
                  ComputedFields: never
                  Insert: {
                           "avatar_url"?: string | null,"bio"?: string | null,"broker_verified"?: boolean | null,"city"?: string | null,"created_at"?: string | null,"crew_size"?: number | null,"district_id"?: number | null,"full_name"?: string | null,"id"?: string | null,"is_broker"?: boolean | null,"jobs_completed"?: number | null,"rating_avg"?: number | null,"rating_count"?: number | null
                         }
                        Update: {
                           "avatar_url"?: string | null,"bio"?: string | null,"broker_verified"?: boolean | null,"city"?: string | null,"created_at"?: string | null,"crew_size"?: number | null,"district_id"?: number | null,"full_name"?: string | null,"id"?: string | null,"is_broker"?: boolean | null,"jobs_completed"?: number | null,"rating_avg"?: number | null,"rating_count"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "profiles_district_id_fkey"
      columns: ["district_id"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_close_hiring":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"_complete_award":
{ Args: { "p_award_id": string }; Returns: undefined
                           },
"_maybe_complete_job":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"add_my_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: undefined
                           },
"admin_cancel_job":
{ Args: { "p_job_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_dashboard_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "awards_this_week": number,"jobs_pending_review": number,"jobs_published": number,"payments_pending": number,"reports_open": number,"signups_today": number
            }[]
                           },
"admin_extend_job":
{ Args: { "p_days": number,"p_job_id": string }; Returns: undefined
                           },
"admin_reject_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_resolve_report":
{ Args: { "p_report_id": string,"p_status": string }; Returns: undefined
                           },
"admin_review_job":
{ Args: { "p_approve": boolean,"p_job_id": string,"p_reason"?: string }; Returns: undefined
                           },
"admin_search_users":
{ Args: { "p_limit"?: number,"p_query"?: string }; Returns: {
              "broker_verified": boolean,"cancelled_awards": number,"created_at": string,"district_id": number,"email": string,"full_name": string,"id": string,"is_broker": boolean,"is_suspended": boolean,"jobs_completed": number,"jobs_posted": number,"phone": string,"phone_verified": boolean,"rating_avg": number,"rating_count": number,"roles": (Database["public"]['Enums']["app_role"])[],"suspended_reason": string
            }[]
                           },
"admin_set_hidden":
{ Args: { "p_hidden": boolean,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"admin_set_job_featured":
{ Args: { "p_job_id": string,"p_value": boolean }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_grant": boolean,"p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"admin_set_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: undefined
                           },
"admin_suspend_user":
{ Args: { "p_reason"?: string,"p_suspend": boolean,"p_user_id": string }; Returns: undefined
                           },
"admin_unpublish_job":
{ Args: { "p_job_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_verify_broker":
{ Args: { "p_user_id": string,"p_value": boolean }; Returns: undefined
                           },
"admin_verify_payment":
{ Args: { "p_payment_id": string }; Returns: undefined
                           },
"admin_waive_payment":
{ Args: { "p_job_id": string,"p_note"?: string }; Returns: undefined
                           },
"auto_confirm_completions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"award_bid":
{ Args: { "p_bid_id": string }; Returns: string
                           },
"can_review":
{ Args: { "p_job_id": string,"p_reviewee": string }; Returns: boolean
                           },
"cancel_award":
{ Args: { "p_award_id": string,"p_reason": string }; Returns: undefined
                           },
"cancel_job":
{ Args: { "p_job_id": string,"p_reason"?: string }; Returns: undefined
                           },
"claim_email_batch":
{ Args: { "p_limit"?: number,"p_types": (string)[] }; Returns: {
              "data": Json,"email": string,"full_name": string,"id": string,"link": string,"preferred_lang": string,"type": string,"user_id": string
            }[]
                           },
"close_hiring":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"detect_contact_info":
{ Args: { "p_text": string }; Returns: (string)[]
                           },
"enforce_rate_limit":
{ Args: { "p_action": string,"p_max": number,"p_window"?: string }; Returns: undefined
                           },
"expire_jobs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_category_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "category_id": number,"open_jobs": number
            }[]
                           },
"get_district_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "avg_daily_rate": number,"district_id": number,"open_jobs": number
            }[]
                           },
"get_home_stats":
{ Args: { "p_district_id"?: number }; Returns: {
              "avg_daily_rate": number,"district_jobs": number,"open_jobs": number
            }[]
                           },
"get_job_contact":
{ Args: { "p_job_id": string }; Returns: {
              "award_id": string,"counterpart": string,"full_name": string,"phone": string,"user_id": string,"workers_count": number
            }[]
                           },
"get_rate_stats":
{ Args: { "p_category_id": number,"p_district_id"?: number }; Returns: {
              "bid_avg": number,"bid_high": number,"bid_low": number,"bid_samples": number,"job_avg": number,"job_samples": number
            }[]
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_job_bidder":
{ Args: { "p_job_id": string }; Returns: boolean
                           },
"is_job_owner":
{ Args: { "p_job_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_admin":
{ Args: { "p_action": string,"p_meta"?: Json,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"mark_award_complete":
{ Args: { "p_award_id": string }; Returns: string
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"new_payment_ref":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify":
{ Args: { "p_data"?: Json,"p_link"?: string,"p_type": string,"p_user": string }; Returns: undefined
                           },
"place_bid":
{ Args: { "p_can_start_on"?: string,"p_days"?: number,"p_job_id": string,"p_message"?: string,"p_rate": number,"p_rate_unit": Database["public"]['Enums']["rate_unit"],"p_workers"?: number }; Returns: string
                           },
"record_ad_click":
{ Args: { "p_id": string }; Returns: string
                           },
"record_ad_impressions":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"record_job_view":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"remove_my_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: undefined
                           },
"require_active_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_phone":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"require_staff":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_bid_shortlisted":
{ Args: { "p_bid_id": string,"p_value": boolean }; Returns: undefined
                           },
"setting":
{ Args: { "p_key": string }; Returns: Json
                           },
"submit_job":
{ Args: { "p_job_id": string }; Returns: Database["public"]['Enums']["job_status"]
                           },
"submit_payment_slip":
{ Args: { "p_bank_ref": string,"p_job_id": string,"p_slip_path": string }; Returns: string
                           },
"warn_expiring_jobs":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"withdraw_bid":
{ Args: { "p_bid_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "publisher"|"worker"|"broker"|"moderator"|"admin","bid_status": "pending"|"shortlisted"|"accepted"|"rejected"|"withdrawn","job_status": "draft"|"pending_payment"|"pending_review"|"published"|"rejected"|"awarded"|"in_progress"|"completed"|"cancelled"|"expired","payment_method": "bank_slip"|"card"|"waived","payment_status": "pending"|"verified"|"rejected","rate_unit": "per_worker_per_day"|"per_day"|"per_project","thread_kind": "question"|"comment"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["publisher", "worker", "broker", "moderator", "admin"],"bid_status": ["pending", "shortlisted", "accepted", "rejected", "withdrawn"],"job_status": ["draft", "pending_payment", "pending_review", "published", "rejected", "awarded", "in_progress", "completed", "cancelled", "expired"],"payment_method": ["bank_slip", "card", "waived"],"payment_status": ["pending", "verified", "rejected"],"rate_unit": ["per_worker_per_day", "per_day", "per_project"],"thread_kind": ["question", "comment"]
          }
        }
} as const
