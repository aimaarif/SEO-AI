import { GlassCard } from "@/components/ui/glass-card";

export function ImageGallery() {
  return (
    <GlassCard className="p-6">
      <h2 className="text-xl font-semibold mb-4">Generated Assets</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <img 
            src="https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
            alt="AI automation tools interface" 
            className="rounded-lg w-full h-24 object-cover" 
          />
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
            alt="Data visualization and analytics charts" 
            className="rounded-lg w-full h-24 object-cover" 
          />
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>✓ Featured image generated</p>
          <p>✓ Infographic created</p>
          <p>✓ Social media thumbnails ready</p>
        </div>
      </div>
    </GlassCard>
  );
}
