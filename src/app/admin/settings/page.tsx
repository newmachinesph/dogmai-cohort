"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  type: string;
  description: string | null;
  category: string;
}

interface GroupedSettings {
  [category: string]: Setting[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, unknown>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data.settings);
      setGrouped(data.grouped);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key: string, value: unknown) => {
    setChanges((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (setting: Setting) => {
    if (changes[setting.key] !== undefined) {
      return changes[setting.key];
    }
    return setting.value;
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const settingsToUpdate = Object.entries(changes).map(([key, value]) => ({
        key,
        value,
      }));

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Settings saved successfully");
      setChanges({});
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChanges({});
    toast.info("Changes discarded");
  };

  const renderInput = (setting: Setting) => {
    const value = getValue(setting);

    switch (setting.type) {
      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={setting.key}
              checked={value === true || value === "true"}
              onChange={(e) => handleChange(setting.key, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor={setting.key} className="text-sm">
              {value === true || value === "true" ? "Enabled" : "Disabled"}
            </label>
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => handleChange(setting.key, parseInt(e.target.value))}
            className="max-w-xs"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="max-w-md"
          />
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: "General",
      enrollment: "Enrollment",
      grading: "Grading",
      notifications: "Notifications",
      appearance: "Appearance",
      attendance: "Attendance",
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      general: "Basic platform settings and configuration",
      enrollment: "Control enrollment rules and limits",
      grading: "Configure grading policies and deadlines",
      notifications: "Email and notification preferences",
      appearance: "Customize the look and feel",
      attendance: "Attendance tracking settings",
    };
    return descriptions[category] || "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categories = Object.keys(grouped);
  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure platform settings and preferences</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Discard
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Notice */}
      {hasChanges && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You have {Object.keys(changes).length} unsaved change{Object.keys(changes).length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue={categories[0] || "general"}>
        <TabsList className="mb-4">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {getCategoryLabel(category)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {getCategoryLabel(category)} Settings
                </CardTitle>
                <CardDescription>{getCategoryDescription(category)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {grouped[category]?.map((setting) => (
                    <div
                      key={setting.key}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 py-4 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <label htmlFor={setting.key} className="block font-medium text-sm">
                          {setting.key
                            .split("_")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}
                        </label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {setting.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">{renderInput(setting)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Empty State */}
      {settings.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No settings found</h3>
              <p className="text-muted-foreground">
                Settings will be initialized when you first access the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
