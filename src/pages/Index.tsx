
import { useState, useRef } from 'react';
import { Camera, MapPin, FileText, Copy, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DetectionResult {
  hasTrash: boolean;
  confidence: number;
  description: string;
}

interface Location {
  latitude?: number;
  longitude?: number;
  address: string;
}

interface Report {
  image: string;
  detection: DetectionResult;
  location: Location;
  timestamp: string;
  reportId: string;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'capture' | 'analyzing' | 'location' | 'report'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [location, setLocation] = useState<Location>({ address: '' });
  const [manualAddress, setManualAddress] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Mock AI detection function (replace with actual NVIDIA Florence-2 implementation)
  const analyzeImage = async (imageData: string): Promise<DetectionResult> => {
    console.log('Analyzing image with AI model...');
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock detection result - in real implementation, this would call the NVIDIA API
    const mockResults = [
      { hasTrash: true, confidence: 0.92, description: 'Plastic bottles and food containers detected on sidewalk' },
      { hasTrash: true, confidence: 0.87, description: 'Scattered paper waste and cigarette butts identified' },
      { hasTrash: false, confidence: 0.23, description: 'No significant waste detected in image' },
      { hasTrash: true, confidence: 0.95, description: 'Large accumulation of mixed garbage including bags and containers' }
    ];
    
    return mockResults[Math.floor(Math.random() * mockResults.length)];
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please try uploading a file instead.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
        
        handleImageAnalysis(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        handleImageAnalysis(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageAnalysis = async (imageData: string) => {
    setCurrentStep('analyzing');
    try {
      const result = await analyzeImage(imageData);
      setDetection(result);
      
      if (result.hasTrash) {
        setCurrentStep('location');
        toast({
          title: "Trash Detected!",
          description: `Detection confidence: ${(result.confidence * 100).toFixed(0)}%`,
        });
      } else {
        toast({
          title: "No Trash Detected",
          description: "The AI didn't detect significant waste in this image. Please try another photo.",
          variant: "destructive",
        });
        setCurrentStep('capture');
        setCapturedImage(null);
        setDetection(null);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('capture');
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Mock reverse geocoding - in real app, use a geocoding service
      const mockAddress = `${Math.floor(Math.random() * 9999)} Main Street, City Center, State 12345`;
      
      setLocation({
        latitude,
        longitude,
        address: mockAddress
      });
      
      toast({
        title: "Location Found",
        description: "Your location has been detected automatically.",
      });
    } catch (error) {
      console.error('Location error:', error);
      toast({
        title: "Location Error",
        description: "Could not get your location. Please enter it manually below.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const generateReport = () => {
    if (!capturedImage || !detection || !location.address) return;

    const newReport: Report = {
      image: capturedImage,
      detection,
      location,
      timestamp: new Date().toISOString(),
      reportId: `TR-${Date.now().toString().slice(-6)}`
    };

    setReport(newReport);
    setCurrentStep('report');
    
    toast({
      title: "Report Generated",
      description: "Your trash report is ready to share!",
    });
  };

  const copyReportToClipboard = () => {
    if (!report) return;

    const reportText = `TRASH REPORT - ${report.reportId}

Date & Time: ${new Date(report.timestamp).toLocaleString()}
Location: ${report.location.address}
${report.location.latitude ? `Coordinates: ${report.location.latitude.toFixed(6)}, ${report.location.longitude?.toFixed(6)}` : ''}

AI Detection Results:
- Confidence: ${(report.detection.confidence * 100).toFixed(0)}%
- Description: ${report.detection.description}

This report was automatically generated using AI detection technology.
Please investigate and take appropriate action.

Image attached separately.`;

    navigator.clipboard.writeText(reportText).then(() => {
      toast({
        title: "Report Copied",
        description: "Report text has been copied to clipboard. You can now paste it into an email or message.",
      });
    });
  };

  const resetApp = () => {
    setCurrentStep('capture');
    setCapturedImage(null);
    setDetection(null);
    setLocation({ address: '' });
    setManualAddress('');
    setReport(null);
    setIsCameraActive(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TrashReporter</h1>
          <p className="text-gray-600">AI-powered waste reporting for your community</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 px-4">
          {[
            { step: 'capture', icon: Camera, label: 'Capture' },
            { step: 'location', icon: MapPin, label: 'Location' },
            { step: 'report', icon: FileText, label: 'Report' }
          ].map(({ step, icon: Icon, label }) => (
            <div key={step} className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                currentStep === step || (currentStep === 'analyzing' && step === 'capture')
                  ? "bg-green-500 border-green-500 text-white"
                  : currentStep === 'location' && step === 'capture'
                  ? "bg-green-500 border-green-500 text-white"
                  : currentStep === 'report' && (step === 'capture' || step === 'location')
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-400"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1 text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Image Capture */}
        {currentStep === 'capture' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Take a Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Capture or upload an image of the trash you want to report. Our AI will automatically detect if waste is present.
              </p>
              
              {!isCameraActive ? (
                <div className="space-y-3">
                  <Button onClick={startCamera} className="w-full" size="lg">
                    <Camera className="w-5 h-5 mr-2" />
                    Open Camera
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">or</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full"
                    size="lg"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <Button onClick={capturePhoto} size="lg" className="w-full">
                    <Camera className="w-5 h-5 mr-2" />
                    Capture Photo
                  </Button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>
        )}

        {/* Step 2: AI Analysis */}
        {currentStep === 'analyzing' && (
          <Card className="shadow-lg">
            <CardContent className="text-center py-8">
              <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Analyzing Image...</h3>
              <p className="text-gray-600">Our AI is detecting trash in your photo</p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Location Input */}
        {currentStep === 'location' && detection && (
          <div className="space-y-6">
            {/* Detection Results */}
            <Card className="shadow-lg border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-800 mb-1">Trash Detected!</h3>
                    <p className="text-sm text-gray-600 mb-2">{detection.description}</p>
                    <div className="text-xs text-gray-500">
                      Confidence: {(detection.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Input */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={getCurrentLocation} 
                  disabled={isLoadingLocation}
                  className="w-full"
                >
                  {isLoadingLocation ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Use Current Location
                    </>
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">or enter manually</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter the exact location where trash was found..."
                    value={location.address || manualAddress}
                    onChange={(e) => {
                      setManualAddress(e.target.value);
                      setLocation({ ...location, address: e.target.value });
                    }}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={generateReport}
                  disabled={!location.address.trim()}
                  className="w-full"
                  size="lg"
                >
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Generated Report */}
        {currentStep === 'report' && report && (
          <div className="space-y-6">
            <Card className="shadow-lg border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Report Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                  <div className="font-bold mb-3">TRASH REPORT - {report.reportId}</div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">Date & Time:</span><br />
                      {new Date(report.timestamp).toLocaleString()}
                    </div>
                    
                    <div>
                      <span className="font-semibold">Location:</span><br />
                      {report.location.address}
                    </div>
                    
                    {report.location.latitude && (
                      <div>
                        <span className="font-semibold">Coordinates:</span><br />
                        {report.location.latitude.toFixed(6)}, {report.location.longitude?.toFixed(6)}
                      </div>
                    )}
                    
                    <div>
                      <span className="font-semibold">AI Detection:</span><br />
                      Confidence: {(report.detection.confidence * 100).toFixed(0)}%<br />
                      {report.detection.description}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <Button onClick={copyReportToClipboard} className="w-full" size="lg">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Report Text
                  </Button>
                  
                  <Button onClick={resetApp} variant="outline" className="w-full">
                    Report Another Issue
                  </Button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Next Steps:</strong> Copy the report text and send it to your municipal corporation along with the photo. Most cities accept reports via email, phone, or their official apps.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
