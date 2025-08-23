import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { 
  Users, 
  Plus, 
  Edit, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  Target,
  TrendingUp,
  Monitor,
  Share2,
  FileText,
  Building,
  Heart,
  Eye,
  DollarSign,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { fetchClients as apiFetchClients, createClient as apiCreateClient, updateClient as apiUpdateClient, verifyWordPressConnection, fetchClientExcel } from "@/lib/api";

interface Client {
  id?: string;
  brandName: string;
  email: string;
  tagline: string;
  mission: string;
  vision: string;
  coreValues: string[];
  brandPurpose: string;
  usp: string;
  logo: string;
  colorPalette: string[];
  typography: {
    primary: string;
    secondary: string;
  };
  brandImagery: string[];
  videoAudioBranding: string;
  brandVoice: string;
  tone: string;
  messagingPillars: string[];
  elevatorPitch: string;
  targetAudience: {
    primary: string;
    secondary: string;
    demographics: string;
  };
  locations: string[];
  marketPositioning: string;
  competitorAnalysis: string;
  customerJourney: string;
  website: string;
  socialMediaProfiles: {
    platform: string;
    url: string;
  }[];
  coreKeywordSilos: string[];
  contentStrategy: string;
  seoStrategy: string;
  adCopy: string[];
  socialCalendar: string;
  emailTemplates: string[];
  brandGuidelines: string;
  // WordPress connection fields
  wpSiteUrl?: string;
  // Application Password fields
  wpUsername?: string;
  wpAppPassword?: string;
  subscription?: {
    plan: string;
    monthlyCost: number;
    credits: number;
    usedCredits: number;
    nextBilling: string;
  };
}

const defaultClient: Client = {
  brandName: "",
  email: "",
  tagline: "",
  mission: "",
  vision: "",
  coreValues: [],
  brandPurpose: "",
  usp: "",
  logo: "",
  colorPalette: [],
  typography: { primary: "", secondary: "" },
  brandImagery: [],
  videoAudioBranding: "",
  brandVoice: "",
  tone: "",
  messagingPillars: [],
  elevatorPitch: "",
  targetAudience: { primary: "", secondary: "", demographics: "" },
  locations: [],
  marketPositioning: "",
  competitorAnalysis: "",
  customerJourney: "",
  website: "",
  socialMediaProfiles: [],
  coreKeywordSilos: [],
  contentStrategy: "",
  seoStrategy: "",
  adCopy: [],
  socialCalendar: "",
  emailTemplates: [],
  brandGuidelines: "",
  wpSiteUrl: "",
  wpUsername: "",
  wpAppPassword: "",
  subscription: {
    plan: "Starter",
    monthlyCost: 99,
    credits: 1000,
    usedCredits: 0,
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(() => {
    try {
      return (
        sessionStorage.getItem('selected-client-id') ||
        localStorage.getItem('selected-client-id') ||
        null
      );
    } catch {
      return null;
    }
  });
  const [currentClient, setCurrentClient] = useState<Client>(defaultClient);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [clientExcelData, setClientExcelData] = useState<any[]>([]);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

  useEffect(() => {
    // Load clients from backend
    apiFetchClients()
      .then((items) => setClients(items as any))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (activeClientId) {
      try { sessionStorage.setItem('selected-client-id', activeClientId); } catch {}
      try { localStorage.setItem('selected-client-id', activeClientId); } catch {}
      
      // Fetch Excel data for the active client
      const fetchExcelData = async () => {
        setIsLoadingExcel(true);
        try {
          const data = await fetchClientExcel(activeClientId);
          setClientExcelData(data);
        } catch (error) {
          console.error('Error fetching Excel data:', error);
          setClientExcelData([]);
        } finally {
          setIsLoadingExcel(false);
        }
      };
      
      fetchExcelData();
    } else {
      setClientExcelData([]);
    }
  }, [activeClientId]);

  // Also fetch Excel data when editing a client
  useEffect(() => {
    if (editingId && editingId !== activeClientId) {
      const fetchExcelData = async () => {
        setIsLoadingExcel(true);
        try {
          const data = await fetchClientExcel(editingId);
          setClientExcelData(data);
        } catch (error) {
          console.error('Error fetching Excel data:', error);
          setClientExcelData([]);
        } finally {
          setIsLoadingExcel(false);
        }
      };
      
      fetchExcelData();
    }
  }, [editingId, activeClientId]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSave = async () => {
    if (isEditing && editingId) {
      try {
        const updatedSummary = await apiUpdateClient({ ...currentClient, id: editingId });
        // After updating, fetch the full client details to ensure all fields are present
        const updatedFullClient = await apiFetchClients().then(clients => clients.find(c => c.id === updatedSummary.id));
        if (updatedFullClient) {
          setClients(prev => prev.map(client => client.id === editingId ? updatedFullClient : client));
        } else {
          // Fallback if full client cannot be fetched, use optimistic update with currentClient
          setClients(prev => prev.map(client => client.id === editingId ? { ...currentClient, id: editingId } : client));
        }
        alert('Client updated successfully.');
      } catch (error) {
        console.error('Error updating client:', error);
        // Fallback: optimistic update
        setClients(prev => prev.map(client => client.id === editingId ? { ...currentClient, id: editingId } : client));
        alert('Failed to update client.');
      }
    } else {
      try {
        const createdSummary = await apiCreateClient({
          userId: undefined,
          ...currentClient,
        });
        // After creating, fetch the full client details to ensure all fields are present
        const createdFullClient = await apiFetchClients().then(clients => clients.find(c => c.id === createdSummary.id));
        if (createdFullClient) {
          setClients(prev => [...prev, createdFullClient]);
        } else {
          // Fallback if full client cannot be fetched, use optimistic add with currentClient
          const newClient = { ...currentClient, id: createdSummary.id || Date.now().toString() };
          setClients(prev => [...prev, newClient]);
        }
        alert('Client saved successfully.');
      } catch (error) {
        console.error('Error creating client:', error);
        // Fallback: optimistic add
        const newClient = { ...currentClient, id: Date.now().toString() };
        setClients(prev => [...prev, newClient]);
        alert('Failed to save client.');
      }
    }
    setCurrentClient(defaultClient);
    setIsEditing(false);
    setEditingId(null);
    // Clear Excel data when saving
    setClientExcelData([]);
  };

  const handleEdit = (client: Client) => {
    setCurrentClient(client);
    setIsEditing(true);
    setEditingId(client.id || null);
    // Clear Excel data when editing a different client
    setClientExcelData([]);
  };

  const handleCancel = () => {
    setCurrentClient(defaultClient);
    setIsEditing(false);
    setEditingId(null);
    // Clear Excel data when canceling edit
    setClientExcelData([]);
  };

  const addArrayItem = (field: keyof Client, value: string) => {
    if (value.trim()) {
      setCurrentClient(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()]
      }));
    }
  };

  const removeArrayItem = (field: keyof Client, index: number) => {
    setCurrentClient(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const sections = [
    {
      id: "basic-info",
      title: "Basic Brand Information",
      icon: Building,
      fields: [
        { key: "brandName", label: "Brand Name", type: "text"},
        { key: "email", label: "Contact Email", type: "text"},
        { key: "tagline", label: "Tagline", type: "textarea", required: false },
        { key: "mission", label: "Mission Statement", type: "textarea", required: false },
        { key: "vision", label: "Vision Statement", type: "textarea", required: false },
        { key: "brandPurpose", label: "Brand Purpose", type: "textarea", required: false },
        { key: "usp", label: "Unique Selling Proposition", type: "textarea", required: false },
      ]
    },
    {
      id: "values-voice",
      title: "Core Values & Brand Voice",
      icon: Heart,
      fields: [
        { key: "coreValues", label: "Core Values", type: "array", required: false },
        { key: "brandVoice", label: "Brand Voice", type: "textarea", required: false },
        { key: "tone", label: "Brand Tone", type: "textarea", required: false },
        { key: "messagingPillars", label: "Messaging Pillars", type: "array", required: false },
        { key: "elevatorPitch", label: "Elevator Pitch", type: "textarea", required: false },
      ]
    },
    {
      id: "visual-identity",
      title: "Visual Identity",
      icon: Eye,
      fields: [
        { key: "logo", label: "Logo URL", type: "text", required: false },
        { key: "colorPalette", label: "Color Palette", type: "array", required: false },
        { key: "typography", label: "Typography", type: "object", required: false },
        { key: "brandImagery", label: "Brand Imagery", type: "array", required: false },
        { key: "videoAudioBranding", label: "Video/Audio Branding", type: "textarea", required: false },
      ]
    },
    {
      id: "audience",
      title: "Target Audience & Market",
      icon: Target,
      fields: [
        { key: "targetAudience", label: "Target Audience", type: "object", required: false },
        { key: "locations", label: "Target Locations", type: "array", required: false },
        { key: "marketPositioning", label: "Market Positioning", type: "textarea", required: false },
        { key: "competitorAnalysis", label: "Competitor Analysis", type: "textarea", required: false },
        { key: "customerJourney", label: "Customer Journey", type: "textarea", required: false },
      ]
    },
    {
      id: "digital-presence",
      title: "Digital Presence",
      icon: Monitor,
      fields: [
        { key: "website", label: "Website URL", type: "text", required: false },
        { key: "socialMediaProfiles", label: "Social Media Profiles", type: "array", required: false },
      ]
    },
    {
      id: "wordpress",
      title: "WordPress Connection",
      icon: Share2,
      fields: [
        { key: "wpSiteUrl", label: "WordPress Site URL", type: "text"},
        { key: "wpUsername", label: "Username", type: "text"},
        { key: "wpAppPassword", label: "Application Password", type: "password"},
      ]
    },
    {
      id: "strategy",
      title: "Content & SEO Strategy",
      icon: TrendingUp,
      fields: [
        { key: "coreKeywordSilos", label: "Core Keyword Silos", type: "array", required: false },
        { key: "contentStrategy", label: "Content Strategy", type: "textarea", required: false },
        { key: "seoStrategy", label: "SEO Strategy", type: "textarea", required: false },
      ]
    },
    {
      id: "marketing",
      title: "Marketing & Distribution",
      icon: Share2,
      fields: [
        { key: "adCopy", label: "Ad Copy", type: "array", required: false },
        { key: "socialCalendar", label: "Social Media Calendar", type: "textarea", required: false },
        { key: "emailTemplates", label: "Email Templates", type: "array", required: false },
      ]
    },
    {
      id: "guidelines",
      title: "Brand Guidelines",
      icon: FileText,
      fields: [
        { key: "brandGuidelines", label: "Brand Guidelines", type: "textarea", required: false },
      ]
    },
    {
      id: "subscription",
      title: "Subscription & Billing",
      icon: CreditCard,
      fields: [
        { key: "subscription.plan", label: "Plan", type: "text", required: false },
        { key: "subscription.monthlyCost", label: "Monthly Cost", type: "number", required: false },
        { key: "subscription.credits", label: "Total Credits", type: "number", required: false },
        { key: "subscription.usedCredits", label: "Used Credits", type: "number", required: false },
        { key: "subscription.nextBilling", label: "Next Billing Date", type: "date", required: false },
      ]
    },
  ];

  type Subscription = NonNullable<Client["subscription"]>;
  const ensureSubscription = (sub?: Client["subscription"]): Subscription => {
    return (sub ?? (defaultClient.subscription as Subscription));
  };
  const updateSubscription = <K extends keyof Subscription>(prev: Client, key: K, value: Subscription[K]): Client => {
    const base = ensureSubscription(prev.subscription);
    return {
      ...prev,
      subscription: { ...base, [key]: value } as Subscription,
    };
  };

  const renderField = (field: any, key: string) => {


    // Handle nested subscription fields
    if (key.startsWith('subscription.')) {
      const subKey = key.split('.')[1];
      const value = (currentClient.subscription as any)?.[subKey] || "";
      const typedKey = subKey as keyof Subscription;
      
      switch (field.type) {
        case "text":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{field.label}</Label>
              <Input
                id={key}
                value={value}
                onChange={(e) => setCurrentClient(prev => updateSubscription(prev, typedKey, e.target.value as Subscription[typeof typedKey]))}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            </div>
          );
        
        case "number":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{field.label}</Label>
              <Input
                id={key}
                type="number"
                value={value as number}
                onChange={(e) => {
                  const num = Number.isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value);
                  return setCurrentClient(prev => updateSubscription(prev, typedKey, num as Subscription[typeof typedKey]));
                }}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            </div>
          );
        
        case "date":
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{field.label}</Label>
              <Input
                id={key}
                type="date"
                value={value as string}
                onChange={(e) => setCurrentClient(prev => updateSubscription(prev, typedKey, e.target.value as Subscription[typeof typedKey]))}
              />
            </div>
          );
        
        default:
          return null;
      }
    }

    switch (field.type) {
      case "text":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{field.label}</Label>
            <Input
              id={key}
              value={currentClient[key as keyof Client] as string || ""}
              onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );
      
      case "password":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{field.label}</Label>
            <Input
              id={key}
              type="password"
              value={currentClient[key as keyof Client] as string || ""}
              onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </div>
        );
      
      case "select":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{field.label}</Label>
            <select
              id={key}
              value={currentClient[key as keyof Client] as string || ""}
              onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {field.options.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      
      case "textarea":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{field.label}</Label>
            <Textarea
              id={key}
              value={currentClient[key as keyof Client] as string || ""}
              onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={3}
            />
          </div>
        );

      
      
      case "array":
        return (
          <div key={key} className="space-y-2">
            <Label>{field.label}</Label>
            <div className="space-y-2">
              {(currentClient[key as keyof Client] as string[] || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={item} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem(key as keyof Client, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder={`Add ${field.label.toLowerCase()}`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addArrayItem(key as keyof Client, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addArrayItem(key as keyof Client, input.value);
                    input.value = '';
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      
      case "object":
        if (key === "typography") {
          return (
            <div key={key} className="space-y-4">
              <Label>{field.label}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Font</Label>
                  <Input
                    value={(currentClient.typography as any)?.primary || ""}
                    onChange={(e) => setCurrentClient(prev => ({
                      ...prev,
                      typography: { ...(prev.typography as any), primary: e.target.value }
                    }))}
                    placeholder="e.g., Inter, Arial"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Font</Label>
                  <Input
                    value={(currentClient.typography as any)?.secondary || ""}
                    onChange={(e) => setCurrentClient(prev => ({
                      ...prev,
                      typography: { ...(prev.typography as any), secondary: e.target.value }
                    }))}
                    placeholder="e.g., Georgia, Times"
                  />
                </div>
              </div>
            </div>
          );
        }
        if (key === "targetAudience") {
          return (
            <div key={key} className="space-y-4">
              <Label>{field.label}</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Audience</Label>
                  <Textarea
                    value={(currentClient.targetAudience as any)?.primary || ""}
                    onChange={(e) => setCurrentClient(prev => ({
                      ...prev,
                      targetAudience: { ...(prev.targetAudience as any), primary: e.target.value }
                    }))}
                    placeholder="Describe your primary target audience"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Audience</Label>
                  <Textarea
                    value={(currentClient.targetAudience as any)?.secondary || ""}
                    onChange={(e) => setCurrentClient(prev => ({
                      ...prev,
                      targetAudience: { ...(prev.targetAudience as any), secondary: e.target.value }
                    }))}
                    placeholder="Describe your secondary target audience"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demographics</Label>
                  <Textarea
                    value={(currentClient.targetAudience as any)?.demographics || ""}
                    onChange={(e) => setCurrentClient(prev => ({
                      ...prev,
                      targetAudience: { ...(prev.targetAudience as any), demographics: e.target.value }
                    }))}
                    placeholder="Age, gender, income, education, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          );
        }
        return null;
      
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-4xl font-bold mb-4 flex items-center"
          >
            <Users className="w-8 h-8 mr-3 text-primary" />
            Client Management
          </motion.h1>
          <motion.p 
            variants={fadeInUp}
            className="text-muted-foreground"
          >
            Manage your clients and their complete brand profiles
          </motion.p>
        </motion.div>
{/* Active Client Selector */}
<div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Active Client</h2>
                  <p className="text-sm text-muted-foreground">This client will be used for Approval and Email flows.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeClientId || ''}
                    onChange={(e) => setActiveClientId(e.target.value || null)}
                    className="w-64 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select a client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id!}>{c.brandName}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* End Active Client Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Client List */}
          <motion.div 
            className="lg:col-span-1"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Clients</h2>
                <Button
                  onClick={() => {
                    setCurrentClient(defaultClient);
                    setIsEditing(false);
                    setEditingId(null);
                    // Clear Excel data when adding new client
                    setClientExcelData([]);
                  }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </div>
              
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleEdit(client)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{client.brandName || "Unnamed Client"}</h3>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {client.tagline || "No tagline"}
                    </p>
                    {client.subscription && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Plan:</span>
                          <span className="font-medium">{client.subscription.plan}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Credits:</span>
                          <span className="font-medium">
                            {client.subscription.usedCredits.toLocaleString()} / {client.subscription.credits.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all ${
                              (client.subscription.usedCredits / client.subscription.credits) > 0.8 
                                ? 'bg-orange-500' 
                                : (client.subscription.usedCredits / client.subscription.credits) > 0.6 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (client.subscription.usedCredits / client.subscription.credits) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No clients yet</p>
                    <p className="text-sm">Add your first client to get started</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Costs Dashboard moved under Clients */}
            <GlassCard className="p-6 mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Costs & Usage
                </h2>
              </div>
              
              <div className="space-y-4">
                {/* Total Monthly Cost */}
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Monthly</span>
                    <span className="text-lg font-bold text-primary">
                      ${clients.reduce((sum, client) => sum + (client.subscription?.monthlyCost || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {clients.length} active clients
                  </div>
                </div>

                {/* Credit Usage Overview */}
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Credits</span>
                    <span className="text-sm font-medium">
                      {clients.reduce((sum, client) => sum + (client.subscription?.usedCredits || 0), 0).toLocaleString()} / {clients.reduce((sum, client) => sum + (client.subscription?.credits || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (clients.reduce((sum, client) => sum + (client.subscription?.usedCredits || 0), 0) / clients.reduce((sum, client) => sum + (client.subscription?.credits || 0), 0)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Usage Alerts */}
                {clients.some(client => (client.subscription?.usedCredits || 0) / (client.subscription?.credits || 1) > 0.8) && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600">High credit usage detected</span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Client Form */}
          <motion.div 
            className="lg:col-span-3"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {isEditing ? "Edit Client" : "Add New Client"}
                </h2>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                {/* Basic Info Section */}
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isOpen = openSections.includes(section.id);
                  
                  return (
                    <Collapsible
                      key={section.id}
                      open={isOpen}
                      onOpenChange={() => toggleSection(section.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-4 h-auto"
                        >
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{section.title}</span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 px-4 pb-4">
                        {section.fields.map((field) => (
                          <div key={field.key}>
                            {(() => {
                              const key = field.key as keyof Client;
                              const label = field.label as string;
                              switch (field.type) {
                                case 'text':
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={String(key)}>{label}</Label>
                                      <Input
                                        id={String(key)}
                                        required
                                        value={(currentClient as any)[key] || ''}
                                        onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
                                        placeholder={`Enter ${label.toLowerCase()}`}
                                      />
                                    </div>
                                  );
                                case 'password':
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={String(key)}>{label}</Label>
                                      <Input
                                        id={String(key)}
                                        type="password"
                                        required
                                        value={(currentClient as any)[key] || ''}
                                        onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
                                        placeholder={`Enter ${label.toLowerCase()}`}
                                      />
                                    </div>
                                  );
                                case 'textarea':
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={String(key)}>{label}</Label>
                                      <Textarea
                                        id={String(key)}
                                        required
                                        value={(currentClient as any)[key] || ''}
                                        onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
                                        placeholder={`Enter ${label.toLowerCase()}`}
                                        rows={3}
                                      />
                                    </div>
                                  );
                                case 'array':
                                  return (
                                    <div className="space-y-2">
                                      <Label>{label}</Label>
                                      <div className="space-y-2">
                                        {((currentClient as any)[key] as string[] || []).map((item: string, index: number) => (
                                          <div key={index} className="flex items-center gap-2">
                                            <Input value={item} readOnly />
                                            <Button type="button" variant="outline" size="sm" onClick={() => removeArrayItem(key as any, index)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ))}
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder={`Add ${label.toLowerCase()}`}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                addArrayItem(key as any, (e.currentTarget as HTMLInputElement).value);
                                                (e.currentTarget as HTMLInputElement).value = '';
                                              }
                                            }}
                                            required={((currentClient as any)[key] as string[] || []).length === 0}
                                          />
                                          <Button type="button" variant="outline" size="sm" onClick={(e) => {
                                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                            addArrayItem(key as any, input.value);
                                            input.value = '';
                                          }}>
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                case 'object':
                                  // For objects, render their child controls (kept required by usage)
                                  return renderField(field, field.key);
                                case 'select':
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={String(key)}>{label}</Label>
                                      <select
                                        id={String(key)}
                                        required
                                        value={(currentClient as any)[key] || ''}
                                        onChange={(e) => setCurrentClient(prev => ({ ...prev, [key]: e.target.value }))}
                                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                      >
                                        {(field as any).options?.map((option: any) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                default:
                                  return null;
                              }
                            })()}
                          </div>
                        ))}
                        {section.id === 'wordpress' && currentClient.id && (
                          <div className="pt-2 space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const result = await verifyWordPressConnection(currentClient.id!);
                                  if (result.success) {
                                    alert('WordPress connection verified successfully!');
                                  } else {
                                    alert(`Connection failed: ${result.error}`);
                                  }
                                } catch (error) {
                                  alert('Failed to verify connection');
                                }
                              }}
                              className="w-full"
                            >
                              Verify Connection
                            </Button>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {/* Excel Upload */}
                <div className="space-y-2 px-4">
                  <Label>Keyword Excel Upload</Label>
                  <p className="text-xs text-muted-foreground">The Excel file must include columns: keyword, content-type, target-audience.</p>
                  <Input id="client-excel" type="file" accept=".xlsx,.xls" required onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    (e.currentTarget as any)._selectedFile = file || null;
                  }} />
                  <Button type="button" variant="outline" size="sm" onClick={async () => {
                    const input = document.getElementById('client-excel') as HTMLInputElement;
                    const file = (input as any)._selectedFile as File | null;
                    if (!file) { alert('Please select an Excel file first.'); return; }
                    if (!editingId) { alert('Save the client first, then upload the Excel.'); return; }
                    const reader = new FileReader();
                    reader.onload = async () => {
                      try {
                        const base64 = String(reader.result);
                        const resp = await fetch(`/api/clients/${editingId}/upload-excel`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName: file.name, base64 })
                        });
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({}));
                          alert(`Upload failed: ${err.error || resp.statusText}`);
                        } else {
                          const json = await resp.json();
                          alert(`Excel uploaded: ${json.rows} rows saved.`);
                          // Refresh Excel data after successful upload
                          if (activeClientId) {
                            try {
                              const data = await fetchClientExcel(activeClientId);
                              setClientExcelData(data);
                            } catch (error) {
                              console.error('Error refreshing Excel data:', error);
                            }
                          }
                          // Also refresh if we're editing this client
                          if (editingId === activeClientId) {
                            try {
                              const data = await fetchClientExcel(editingId);
                              setClientExcelData(data);
                            } catch (error) {
                              console.error('Error refreshing Excel data:', error);
                            }
                          }
                        }
                      } catch (err) {
                        alert('Upload failed.');
                      }
                    };
                    reader.readAsDataURL(file);
                  }}>Upload Excel</Button>
                </div>

                

                <div className="flex gap-3 pt-6 border-t">
                  <Button type="submit" className="flex-1" onClick={async () => {}}>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditing ? "Update Client" : "Save Client"}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
      <br /><br />
      {/* Excel Data Display */}
      {(activeClientId || editingId) && (
                  <div className="space-y-4 px-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Uploaded Excel Data</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const clientId = editingId || activeClientId;
                          if (clientId) {
                            setIsLoadingExcel(true);
                            try {
                              const data = await fetchClientExcel(clientId);
                              setClientExcelData(data);
                            } catch (error) {
                              console.error('Error refreshing Excel data:', error);
                            } finally {
                              setIsLoadingExcel(false);
                            }
                          }
                        }}
                        disabled={isLoadingExcel}
                      >
                        {isLoadingExcel ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                    
                    {isLoadingExcel ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Loading Excel data...</p>
                      </div>
                    ) : clientExcelData.length > 0 ? (
                      <div className="space-y-4">
                        {/* Group by batch */}
                        {Array.from(new Set(clientExcelData.map(item => item.batchId))).map(batchId => {
                          const batchData = clientExcelData.filter(item => item.batchId === batchId);
                          const fileName = batchData[0]?.originalFileName || 'Unknown file';
                          const uploadDate = new Date(batchData[0]?.createdAt).toLocaleDateString();
                          
                          return (
                            <div key={batchId} className="space-y-3">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span><strong>File:</strong> {fileName}</span>
                                <span><strong>Uploaded:</strong> {uploadDate}</span>
                                <span><strong>Rows:</strong> {batchData.length}</span>
                              </div>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-border">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      {(() => {
                                        const headerSet = new Set<string>();
                                        batchData.forEach((row: any) => {
                                          Object.keys(row?.data || {}).forEach((h) => headerSet.add(h));
                                        });
                                        headerSet.add('Automation');
                                        const headers = Array.from(headerSet);
                                        return headers.map((header) => (
                                          <th key={header} className="border border-border px-3 py-2 text-left text-sm font-medium">
                                            {header}
                                          </th>
                                        ));
                                      })()}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const headerSet = new Set<string>();
                                      batchData.forEach((row: any) => {
                                        Object.keys(row?.data || {}).forEach((h) => headerSet.add(h));
                                      });
                                      headerSet.add('Automation');
                                      const headers = Array.from(headerSet);
                                      return batchData.map((row: any) => (
                                        <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                                          {headers.map((h) => (
                                            <td key={h} className="border border-border px-3 py-2 text-sm">
                                              {h === 'Automation' 
                                                ? (row?.automation ?? row?.data?.[h] ?? 'pending') 
                                                : (row?.data?.[h]?.toString() || '')}
                                            </td>
                                          ))}
                                        </tr>
                                        
                                      ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No Excel data uploaded yet</p>
                        <p className="text-sm">Upload an Excel file to see the data here</p>
                      </div>
                    )}
                  </div>
                )}
    </motion.div>
  );
}