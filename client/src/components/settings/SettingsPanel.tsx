import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function SettingsPanel() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="openai-key" className="text-sm font-medium mb-2 block">
              OpenAI API Key
            </Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showApiKey ? "text" : "password"}
                placeholder="sk-..."
                className="bg-muted/50 border-border focus:border-primary pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="sheets-api" className="text-sm font-medium mb-2 block">
              Google Sheets API
            </Label>
            <Input
              id="sheets-api"
              type="password"
              placeholder="Enter API key..."
              className="bg-muted/50 border-border focus:border-primary"
            />
          </div>
          
          <div>
            <Label htmlFor="wordpress-url" className="text-sm font-medium mb-2 block">
              WordPress URL
            </Label>
            <Input
              id="wordpress-url"
              type="url"
              placeholder="https://yourblog.com"
              className="bg-muted/50 border-border focus:border-primary"
            />
          </div>
        </div>
      </GlassCard>

      {/* Model Selection */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">AI Model Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Primary Writer Model</Label>
            <Select>
              <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude-3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude-3 Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Keyword Research Model</Label>
            <Select>
              <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Temperature: {temperature[0]}
            </Label>
            <div className="flex items-center space-x-4">
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                max={1}
                min={0}
                step={0.1}
                className="flex-1"
              />
              <span className="text-primary font-medium w-8">{temperature[0]}</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Automation Schedule */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Automation Schedule</h2>
        <div className="space-y-4">
          {[
            {
              title: "Daily Keyword Research",
              description: "Runs every day at 9:00 AM",
              enabled: true
            },
            {
              title: "Auto Content Generation", 
              description: "Generate drafts when keywords found",
              enabled: true
            },
            {
              title: "Auto Social Media Posting",
              description: "Post when articles are published", 
              enabled: false
            }
          ].map((item) => (
            <div key={item.title} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch defaultChecked={item.enabled} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Notification Settings */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: "Email notifications", enabled: true },
            { label: "Browser notifications", enabled: false },
            { label: "Slack integration", enabled: false }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span>{item.label}</span>
              <Switch defaultChecked={item.enabled} />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Save Settings */}
      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon">
        Save Configuration
      </Button>
    </div>
  );
}
